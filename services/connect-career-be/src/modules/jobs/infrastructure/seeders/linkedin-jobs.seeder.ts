import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import chain from 'stream-chain';
import { parser } from 'stream-json';
import { streamArray } from 'stream-json/streamers/StreamArray';
import { Job, JobSource } from '../../domain/entities/job.entity';
import { JobPosting } from '../types/job_linkedin.types';
import {
  Organization,
  OrganizationType,
  OrganizationSize,
  WorkingDay,
  OvertimePolicy,
} from 'src/modules/profile/domain/entities/organization.entity';
import { User, UserStatus } from 'src/modules/identity/domain/entities';
import { Industry } from 'src/modules/profile/domain/entities/industry.entity';
import {
  File,
  FileStatus,
  FileType,
} from 'src/shared/infrastructure/external-services/file-system/domain/entities/file.entity';
import { Role } from 'src/modules/identity/domain/entities/role.entity';

@Injectable()
export class LinkedInJobsSeeder {
  private readonly logger = new Logger(LinkedInJobsSeeder.name);
  private readonly BATCH_SIZE = 500;

  // Caches to avoid duplicate DB lookups
  private orgCache = new Map<string, Organization>();
  private userCache = new Map<string, User>();
  private industryCache = new Map<string, Industry>();
  private roleCache = new Map<string, Role>();
  private systemUser: User | null = null;
  private defaultIndustry: Industry | null = null;
  private hrRole: Role | null = null;

  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Industry)
    private readonly industryRepo: Repository<Industry>,
    @InjectRepository(File)
    private readonly fileRepo: Repository<File>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {}

  /**
   * Seed jobs from all LinkedIn JSON files
   */
  async seedAllFiles(): Promise<void> {
    this.logger.log('🚀 Starting LinkedIn jobs seeding process...');

    // Initialize system resources
    await this.initializeSystemResources();

    const seedersDir = __dirname.includes('dist')
      ? path.join(
          process.cwd(),
          'src',
          'modules',
          'jobs',
          'infrastructure',
          'seeders',
        )
      : __dirname;

    this.logger.log(`Looking for JSON files in: ${seedersDir}`);

    if (!fs.existsSync(seedersDir)) {
      this.logger.error(`Seeders directory not found: ${seedersDir}`);
      return;
    }

    const jsonFiles = fs
      .readdirSync(seedersDir)
      .filter(
        (file) =>
          file.startsWith('linkedin_job_listings_information') &&
          file.endsWith('.json'),
      )
      .sort();

    this.logger.log(`Found ${jsonFiles.length} JSON files to process`);

    let totalProcessed = 0;
    let totalSkipped = 0;

    for (const file of jsonFiles) {
      const filePath = path.join(seedersDir, file);
      this.logger.log(`\n📂 Processing file: ${file}`);

      const { processed, skipped } = await this.seedFromFile(filePath);
      totalProcessed += processed;
      totalSkipped += skipped;

      this.logger.log(
        `✅ Completed ${file}: ${processed} jobs, ${skipped} skipped`,
      );
    }

    this.clearCaches();

    this.logger.log(
      `\n🎉 Seeding completed! Total: ${totalProcessed} jobs created, ${totalSkipped} skipped`,
    );
  }

  /**
   * Seed jobs from a single file
   */
  async seedFromFile(
    filePath: string,
  ): Promise<{ processed: number; skipped: number }> {
    let processed = 0;
    let skipped = 0;
    const batch: Job[] = [];

    await new Promise<void>((resolve, reject) => {
      const pipeline = chain([
        fs.createReadStream(filePath, { encoding: 'utf8' }),
        parser() as any,
        streamArray() as any,
      ]);

      pipeline.on('data', (data: { key: number; value: JobPosting }) => {
        const linkedinJob = data.value;

        pipeline.pause();
        void (async () => {
          try {
            // Check if job already exists
            const exists = await this.jobRepo.findOne({
              where: {
                source: JobSource.LINKEDIN,
                sourceId: linkedinJob.job_posting_id,
              },
            });

            if (exists) {
              skipped++;
              pipeline.resume();
              return;
            }

            const job = await this.mapLinkedInJob(linkedinJob);
            if (job) {
              batch.push(job);
              processed++;

              if (batch.length >= this.BATCH_SIZE) {
                await this.jobRepo.save(batch, {
                  chunk: this.BATCH_SIZE,
                  reload: false,
                });
                this.logger.log(
                  `💾 Saved batch (processed: ${processed}, skipped: ${skipped})`,
                );
                batch.length = 0;

                // Trigger garbage collection if available
                if (global.gc) global.gc();
              }
            } else {
              skipped++;
            }
          } catch (error) {
            this.logger.warn(
              `Failed to process job ${linkedinJob.job_posting_id}: ${error instanceof Error ? error.message : String(error)}`,
            );
            skipped++;
          } finally {
            pipeline.resume();
          }
        })();
      });

      pipeline.on('end', () => {
        void (async () => {
          try {
            // Save remaining jobs in batch
            if (batch.length > 0) {
              await this.jobRepo.save(batch, {
                chunk: this.BATCH_SIZE,
                reload: false,
              });
              this.logger.log(`💾 Saved final batch of ${batch.length} jobs`);
            }
            resolve();
          } catch (e) {
            reject(e instanceof Error ? e : new Error(String(e)));
          }
        })();
      });

      pipeline.on('error', reject);
    });

    return { processed, skipped };
  }

  /**
   * Map LinkedIn job data to Job entity
   */
  private async mapLinkedInJob(linkedinJob: JobPosting): Promise<Job | null> {
    if (!linkedinJob.job_posting_id || !linkedinJob.company_name) {
      return null;
    }

    // Find or create organization
    const organization = await this.findOrCreateOrganization(linkedinJob);
    if (!organization) {
      this.logger.warn(
        `Failed to create organization for job ${linkedinJob.job_posting_id}`,
      );
      return null;
    }

    // Find or create HR user for the organization
    const hrUser = await this.findOrCreateHRUser(organization);
    if (!hrUser) {
      this.logger.warn(
        `Failed to create HR user for organization ${organization.name}`,
      );
      return null;
    }

    // Create job using the factory method
    const job = Job.fromLinkedIn(linkedinJob);

    // Set relationships
    job.organizationId = organization.id;
    job.userId = hrUser.id;
    job.employerId = hrUser.id;

    // Extract keywords from job function and industries
    job.keywords = this.extractKeywords(linkedinJob);

    return job;
  }

  /**
   * Find or create an organization for a LinkedIn job
   */
  private async findOrCreateOrganization(
    linkedinJob: JobPosting,
  ): Promise<Organization | null> {
    const companyKey = `${linkedinJob.company_id}_${linkedinJob.company_name}`;

    // Check cache first
    if (this.orgCache.has(companyKey)) {
      return this.orgCache.get(companyKey)!;
    }

    try {
      // Try to find existing organization
      let organization = await this.orgRepo.findOne({
        where: { name: linkedinJob.company_name },
      });

      if (!organization) {
        // Create new organization
        const industry = await this.getOrCreateIndustry(
          linkedinJob.job_industries,
        );

        // Create logo file if available
        let logoFileId: string | null = null;
        if (linkedinJob.company_logo) {
          try {
            const logoFile = this.createLogoFile(
              linkedinJob.company_logo,
              this.systemUser!.id,
              linkedinJob.company_name,
            );
            const savedLogo = await this.fileRepo.save(logoFile);
            logoFileId = savedLogo.id;
          } catch (error) {
            this.logger.warn(
              `Failed to save logo for ${linkedinJob.company_name}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }

        const orgData = {
          userId: this.systemUser!.id,
          name: linkedinJob.company_name,
          industryId: industry.id,
          organizationType: OrganizationType.OTHER,
          organizationSize: OrganizationSize.STARTUP,
          country: this.extractCountry(linkedinJob.job_location),
          city: this.extractCity(linkedinJob.job_location),
          workingDays: [
            WorkingDay.MONDAY,
            WorkingDay.TUESDAY,
            WorkingDay.WEDNESDAY,
            WorkingDay.THURSDAY,
            WorkingDay.FRIDAY,
          ],
          overtimePolicy: OvertimePolicy.NO_OVERTIME,
          workScheduleTypes: [],
          logoFileId: logoFileId || undefined,
          website: linkedinJob.company_url || undefined,
          socialMedia: linkedinJob.company_url
            ? { linkedin: linkedinJob.company_url }
            : undefined,
          isActive: true,
          isPublic: true,
          keywords: linkedinJob.job_industries
            ? [linkedinJob.job_industries.toLowerCase()]
            : [],
        } as Partial<Organization>;

        const createdOrg = this.orgRepo.create(orgData);
        organization = await this.orgRepo.save(createdOrg);
        this.logger.debug(`Created organization: ${organization.name}`);
      }

      this.orgCache.set(companyKey, organization);
      return organization;
    } catch (error) {
      this.logger.error(
        `Failed to find/create organization ${linkedinJob.company_name}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /**
   * Find or create an HR user for an organization
   */
  private async findOrCreateHRUser(
    organization: Organization,
  ): Promise<User | null> {
    const userKey = `hr_${organization.id}`;

    // Check cache first
    if (this.userCache.has(userKey)) {
      return this.userCache.get(userKey)!;
    }

    try {
      // Create a unique email for the HR user
      const hrEmail = `hr.${organization.id}@${this.slugify(organization.name || 'company')}.seeded`;

      let user = await this.userRepo.findOne({
        where: { email: hrEmail },
        relations: ['roles'],
      });

      if (!user) {
        user = this.userRepo.create({
          email: hrEmail,
          firstName: 'HR',
          lastName: organization.name,
          fullName: `HR - ${organization.name}`,
          emailVerified: false,
          status: UserStatus.ACTIVE,
        });

        user = await this.userRepo.save(user);

        // Assign HR role
        if (this.hrRole) {
          user.roles = [this.hrRole];
          await this.userRepo.save(user);
        }

        this.logger.debug(`Created HR user for: ${organization.name}`);
      }

      this.userCache.set(userKey, user);
      return user;
    } catch (error) {
      this.logger.error(
        `Failed to create HR user for ${organization.name || 'Unknown'}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /**
   * Initialize system resources (system user, default industry, HR role)
   */
  private async initializeSystemResources(): Promise<void> {
    // Get or create system user
    this.systemUser = await this.getOrCreateSystemUser();

    // Get or create default industry
    this.defaultIndustry = await this.getDefaultIndustry();

    // Get or create HR role
    this.hrRole = await this.getOrCreateHRRole();

    this.logger.log('✅ System resources initialized');
  }

  private async getOrCreateSystemUser(): Promise<User> {
    const systemEmail = 'system@connect-career.com';
    let systemUser = await this.userRepo.findOne({
      where: { email: systemEmail },
    });

    if (!systemUser) {
      systemUser = this.userRepo.create({
        email: systemEmail,
        firstName: 'System',
        lastName: 'User',
        fullName: 'System User',
        emailVerified: true,
        status: UserStatus.ACTIVE,
      });
      systemUser = await this.userRepo.save(systemUser);
      this.logger.log('Created system user');
    }

    return systemUser;
  }

  private async getDefaultIndustry(): Promise<Industry> {
    let industry = await this.industryRepo.findOne({
      where: { name: 'Technology' },
    });

    if (!industry) {
      industry = this.industryRepo.create({
        name: 'Technology',
        description: 'Technology and software development',
        keywords: ['technology', 'software', 'it'],
        isActive: true,
      });
      industry = await this.industryRepo.save(industry);
    }

    return industry;
  }

  private async getOrCreateHRRole(): Promise<Role> {
    let role = await this.roleRepo.findOne({
      where: { name: 'Employer' },
    });

    if (!role) {
      role = this.roleRepo.create({
        name: 'Employer',
        description: 'Human Resources and recruitment personnel',
        isActive: true,
        isSystemRole: false,
      });
      role = await this.roleRepo.save(role);
      this.logger.log('Created Employer role');
    }

    return role;
  }

  private async getOrCreateIndustry(industryName?: string): Promise<Industry> {
    if (!industryName || !industryName.trim()) {
      return this.defaultIndustry!;
    }

    const cacheKey = industryName.trim().toLowerCase();

    if (this.industryCache.has(cacheKey)) {
      return this.industryCache.get(cacheKey)!;
    }

    let industry = await this.industryRepo.findOne({
      where: { name: industryName.trim() },
    });

    if (!industry) {
      industry = this.industryRepo.create({
        name: industryName.trim(),
        description: `${industryName} industry`,
        keywords: [industryName.toLowerCase()],
        isActive: true,
      });
      industry = await this.industryRepo.save(industry);
    }

    this.industryCache.set(cacheKey, industry);
    return industry;
  }

  private createLogoFile(
    logoUrl: string,
    userId: string,
    companyName: string,
  ): File {
    const urlParts = logoUrl.split('/');
    const fileName = urlParts[urlParts.length - 1] || 'logo.jpg';

    return this.fileRepo.create({
      originalName: `${companyName}-logo.jpg`,
      fileName: fileName,
      mimeType: 'image/jpeg',
      fileSize: 0,
      url: logoUrl,
      secureUrl: logoUrl,
      status: FileStatus.READY,
      type: FileType.IMAGE,
      folder: 'company-logos',
      description: `Company logo for ${companyName} from LinkedIn`,
      isPublic: true,
      uploadedById: userId,
      tags: ['logo', 'company', 'linkedin'],
    });
  }

  /**
   * Extract keywords from job data
   */
  private extractKeywords(linkedinJob: JobPosting): string[] {
    const keywords: string[] = [];

    if (linkedinJob.job_function) {
      keywords.push(
        ...linkedinJob.job_function
          .split(',')
          .map((k) => k.trim().toLowerCase()),
      );
    }

    if (linkedinJob.job_industries) {
      keywords.push(
        ...linkedinJob.job_industries
          .split(',')
          .map((k) => k.trim().toLowerCase()),
      );
    }

    if (linkedinJob.job_seniority_level) {
      keywords.push(linkedinJob.job_seniority_level.toLowerCase());
    }

    // Add job type
    if (linkedinJob.job_employment_type) {
      keywords.push(linkedinJob.job_employment_type.toLowerCase());
    }

    // Remove duplicates
    return [...new Set(keywords)];
  }

  /**
   * Extract country from location string
   */
  private extractCountry(location: string): string {
    if (!location) return 'Unknown';

    // Common patterns: "City, State, Country" or "City, Country"
    const parts = location.split(',').map((p) => p.trim());

    if (parts.length >= 3) {
      return parts[2]; // Likely country
    } else if (parts.length === 2) {
      return parts[1]; // Likely country
    } else if (parts.length === 1) {
      return parts[0]; // Just location name
    }

    return 'Unknown';
  }

  /**
   * Extract city from location string
   */
  private extractCity(location: string): string | null {
    if (!location) return null;

    const parts = location.split(',').map((p) => p.trim());
    return parts[0] || null; // First part is usually the city
  }

  /**
   * Convert string to URL-friendly slug
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove non-word chars
      .replace(/\s+/g, '-') // Replace spaces with -
      .replace(/--+/g, '-') // Replace multiple - with single -
      .trim();
  }

  /**
   * Clear all caches to free memory
   */
  private clearCaches(): void {
    this.orgCache.clear();
    this.userCache.clear();
    this.industryCache.clear();
    this.roleCache.clear();
    this.systemUser = null;
    this.defaultIndustry = null;
    this.hrRole = null;
  }
}
