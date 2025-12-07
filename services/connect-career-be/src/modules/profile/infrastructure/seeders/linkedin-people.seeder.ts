import { Injectable, Logger } from '@nestjs/common';
import { CandidateProfile } from '../../domain/entities/candidate-profile.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  WorkExperience,
  EmploymentType,
} from '../../domain/entities/work-experience.entity';
import { DegreeType, Education } from '../../domain/entities/education.entity';
import { Certification } from '../../domain/entities/certification.entity';
import { User } from 'src/modules/identity/domain/entities';
import {
  Organization,
  OrganizationType,
  OrganizationSize,
  WorkingDay,
  OvertimePolicy,
} from '../../domain/entities/organization.entity';
import { Industry } from '../../domain/entities/industry.entity';
import {
  File,
  FileStatus,
  FileType,
} from 'src/shared/infrastructure/external-services/file-system/domain/entities/file.entity';
import chain from 'stream-chain';
import * as fs from 'fs';
import { parser } from 'stream-json';
import { streamArray } from 'stream-json/streamers/StreamArray';
import { LinkedInPeopleProfile } from '../../domain/types/linkedin-people-profile.type';

@Injectable()
export class LinkedInPeopleSeeder {
  private readonly logger = new Logger(LinkedInPeopleSeeder.name);
  private readonly BATCH_SIZE = 300;

  // Cache to avoid duplicate DB lookups
  private userCache = new Map<string, User>();
  private orgCache = new Map<string, Organization>();
  private industryCache = new Map<string, Industry>();
  private systemUser: User | null = null;

  constructor(
    @InjectRepository(CandidateProfile)
    private readonly profileRepo: Repository<CandidateProfile>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(Industry)
    private readonly industryRepo: Repository<Industry>,
    @InjectRepository(File)
    private readonly fileRepo: Repository<File>,
  ) {}

  async seedFromFile(filePath: string): Promise<void> {
    this.logger.log(`Seeding people profiles from ${filePath}`);

    this.systemUser = await this.getOrCreateSystemUser();
    const defaultIndustry = await this.getDefaultIndustry();
    this.industryCache.set('__DEFAULT__', defaultIndustry);

    let count = 0;
    let skipped = 0;
    const batch: CandidateProfile[] = [];

    await new Promise<void>((resolve, reject) => {
      const pipeline = chain([
        fs.createReadStream(filePath, { encoding: 'utf8' }),
        parser({} as any) as any,
        streamArray() as any,
      ]);

      pipeline.on(
        'data',
        (data: { key: number; value: LinkedInPeopleProfile }) => {
          const raw = data.value;

          pipeline.pause();
          void (async () => {
            try {
              const profile = await this.mapPerson(raw);
              if (profile) {
                batch.push(profile);
                count++;

                if (batch.length >= this.BATCH_SIZE) {
                  await this.profileRepo.save(batch, {
                    chunk: this.BATCH_SIZE,
                    reload: false,
                  });
                  this.logger.log(
                    `✅ Saved batch (total: ${count}, skipped: ${skipped})`,
                  );
                  batch.length = 0;

                  if (global.gc) global.gc();
                }
              } else {
                skipped++;
              }
            } catch (error) {
              this.logger.warn(
                `Failed to map profile ${raw.id}: ${error.message}`,
              );
              skipped++;
            } finally {
              pipeline.resume();
            }
          })();
        },
      );

      pipeline.on('end', () => {
        void (async () => {
          try {
            if (batch.length) {
              await this.profileRepo.save(batch, {
                chunk: this.BATCH_SIZE,
                reload: false,
              });
            }
            this.logger.log(
              `✅ Seeded ${count} candidate profiles (skipped: ${skipped})`,
            );
            this.clearCaches();
            resolve();
          } catch (e) {
            reject(e instanceof Error ? e : new Error(String(e)));
          }
        })();
      });

      pipeline.on('error', reject);
    });
  }

  private async mapPerson(
    src: LinkedInPeopleProfile,
  ): Promise<CandidateProfile | null> {
    if (!src.id || !src.linkedin_id) return null;

    const user = await this.findOrCreateUser(src);
    if (!user) return null;

    const workExperiences: WorkExperience[] = [];
    for (const exp of src.experience || []) {
      if (!exp.company) continue;

      const org = await this.findOrCreateOrganization(
        exp.company,
        exp.company_logo_url,
        src.current_company?.company_id,
      );

      if (org) {
        const workExp = new WorkExperience();
        workExp.jobTitle = exp.title || exp.subtitle || 'Unknown Position';
        workExp.organizationId = org.id;
        workExp.organization = org;
        workExp.employmentType = EmploymentType.FULL_TIME;
        workExp.description = exp.description_html || undefined;
        workExp.skills = [];
        workExp.candidateProfileId = user.id;

        workExp.startDate = new Date();
        workExp.isCurrent = exp.company === src.current_company?.name;

        workExperiences.push(workExp);
      }
    }

    const educations = (src.education || []).map((ed) => {
      const edu = new Education();
      edu.institutionName = ed.title || 'Unknown Institution';
      edu.degreeType = this.mapDegreeType(ed.title);
      edu.fieldOfStudy = ed.description || '';
      edu.candidateProfileId = user.id;

      if (ed.end_year) {
        const year = parseInt(ed.end_year, 10);
        if (!isNaN(year)) {
          edu.graduationDate = new Date(year, 5, 1);
        }
      }
      edu.isCurrent = false;

      return edu;
    });

    const certifications = (src.certifications || []).map((cert) => {
      const certification = new Certification();
      certification.name = cert.title;
      certification.issuingOrganization = cert.subtitle;
      certification.credentialId = cert.credential_id;
      certification.credentialUrl = cert.credential_url;
      certification.description = cert.meta;
      certification.issueDate = new Date();
      certification.isActive = true;
      certification.skills = [];
      certification.candidateProfileId = user.id;

      return certification;
    });

    const languages = (src.languages || []).map((lang) => lang.title);

    const entity = this.profileRepo.create({
      userId: user.id,
      user,
      city: src.city,
      country: this.mapCountryCode(src.country_code),
      socialLinks: {
        linkedin: src.url,
      },
      languages,
      skills: [],
      workExperiences,
      educations,
      certifications,
    });

    entity.calculateCompletionPercentage();
    await this.profileRepo.save(entity);
    return entity;
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
        emailVerified: true,
        isActive: true,
      });
      systemUser = await this.userRepo.save(systemUser);
      this.logger.log('Created system user for organizations');
    }

    return systemUser;
  }

  private async findOrCreateUser(
    profile: LinkedInPeopleProfile,
  ): Promise<User | null> {
    const cacheKey = profile.linkedin_id;

    if (this.userCache.has(cacheKey)) {
      return this.userCache.get(cacheKey)!;
    }

    try {
      const email = `${profile.linkedin_id}@linkedin.seeded`;
      let user = await this.userRepo.findOne({
        where: { email },
      });

      if (!user) {
        user = this.userRepo.create({
          email,
          firstName: profile.first_name || 'Unknown',
          lastName: profile.last_name || 'User',
          emailVerified: false,
          isActive: true,
        });
        user = await this.userRepo.save(user);
      }

      this.userCache.set(cacheKey, user);
      return user;
    } catch (error) {
      this.logger.error(
        `Failed to create user for ${profile.linkedin_id}: ${error.message}`,
      );
      return null;
    }
  }

  private async findOrCreateOrganization(
    companyName: string,
    logoUrl?: string,
    companyId?: string,
  ): Promise<Organization | null> {
    if (!companyName) return null;

    const cacheKey = companyName.toLowerCase().trim();

    if (this.orgCache.has(cacheKey)) {
      return this.orgCache.get(cacheKey)!;
    }

    try {
      let org = await this.orgRepo.findOne({
        where: { name: companyName },
      });

      if (!org) {
        const orgData = await this.mapCompanyToPlainObject({
          name: companyName,
          logo: logoUrl,
          company_id: companyId,
        });

        org = this.orgRepo.create(orgData as Organization);
        org = await this.orgRepo.save(org);
      }

      this.orgCache.set(cacheKey, org);
      return org;
    } catch (error) {
      this.logger.warn(
        `Failed to create organization ${companyName}: ${error.message}`,
      );
      return null;
    }
  }

  private async mapCompanyToPlainObject(src: {
    name: string;
    logo?: string;
    company_id?: string;
  }): Promise<any> {
    const industry = this.industryCache.get('__DEFAULT__')!;

    let logoFileId: string | null = null;
    if (src.logo && this.systemUser) {
      try {
        const logoFile = this.createLogoFile(src.logo, this.systemUser.id);
        const savedLogoFile = await this.fileRepo.save(logoFile);
        logoFileId = savedLogoFile.id;
      } catch (error) {
        this.logger.warn(
          `Failed to save logo for ${src.name}: ${error.message}`,
        );
      }
    }

    return {
      userId: this.systemUser!.id,
      industryId: industry?.id,
      name: src.name,
      logoFileId: logoFileId,
      organizationType: OrganizationType.OTHER,
      organizationSize: OrganizationSize.STARTUP,
      employeeCount: null,
      country: 'Unknown',
      stateProvince: null,
      city: null,
      headquartersAddress: null,
      workingDays: [
        WorkingDay.MONDAY,
        WorkingDay.TUESDAY,
        WorkingDay.WEDNESDAY,
        WorkingDay.THURSDAY,
        WorkingDay.FRIDAY,
      ],
      overtimePolicy: OvertimePolicy.NO_OVERTIME,
      workScheduleTypes: [],
      tagline: null,
      shortDescription: null,
      longDescription: null,
      website: null,
      socialMedia: src.company_id
        ? { linkedin: `https://www.linkedin.com/company/${src.company_id}` }
        : null,
      keywords: [],
      isActive: true,
      isPublic: true,
    };
  }

  private createLogoFile(logoUrl: string, userId: string): File {
    const urlParts = logoUrl.split('/');
    const fileName = urlParts[urlParts.length - 1] || 'logo.jpg';

    return this.fileRepo.create({
      originalName: fileName,
      fileName: fileName,
      mimeType: 'image/jpeg',
      fileSize: 0,
      url: logoUrl,
      secureUrl: logoUrl,
      status: FileStatus.READY,
      type: FileType.IMAGE,
      folder: 'company-logos',
      description: 'Company logo from LinkedIn',
      isPublic: true,
      uploadedById: userId,
      tags: ['logo', 'company', 'linkedin'],
    });
  }

  // ===== INDUSTRY MANAGEMENT (from org seeder) =====
  private async findOrCreateIndustry(
    industryName?: string,
  ): Promise<Industry | null> {
    if (!industryName) {
      return this.industryCache.get('__DEFAULT__')!;
    }

    const cacheKey = industryName.trim().toLowerCase();

    if (this.industryCache.has(cacheKey)) {
      return this.industryCache.get(cacheKey)!;
    }

    let industry = await this.industryRepo.findOneBy({
      name: industryName.trim(),
    });

    if (!industry) {
      industry = this.industryRepo.create({
        name: industryName.trim(),
        description: `Industry for ${industryName}`,
        keywords: [industryName.toLowerCase()],
        isActive: true,
      });
      industry = await this.industryRepo.save(industry);
    }
    this.industryCache.set(cacheKey, industry);
    return industry;
  }

  private async getDefaultIndustry(): Promise<Industry> {
    let defaultIndustry = await this.industryRepo.findOne({
      where: { name: 'Other' },
    });

    if (!defaultIndustry) {
      defaultIndustry = this.industryRepo.create({
        name: 'Other',
        description: 'Default industry for companies without specific industry',
        keywords: ['other', 'general'],
        isActive: true,
      });
      defaultIndustry = await this.industryRepo.save(defaultIndustry);
    }

    return defaultIndustry;
  }

  // ===== HELPER METHODS =====
  private mapDegreeType(degreeTitle?: string): DegreeType {
    if (!degreeTitle) return DegreeType.BACHELOR;

    const lowerDegree = degreeTitle.toLowerCase();
    if (lowerDegree.includes('phd') || lowerDegree.includes('doctorate'))
      return DegreeType.DOCTORATE;
    if (lowerDegree.includes('master')) return DegreeType.MASTER;
    if (lowerDegree.includes('bachelor')) return DegreeType.BACHELOR;
    if (lowerDegree.includes('associate')) return DegreeType.ASSOCIATE;
    if (lowerDegree.includes('certificate')) return DegreeType.CERTIFICATE;
    if (lowerDegree.includes('diploma')) return DegreeType.DIPLOMA;
    if (lowerDegree.includes('high school')) return DegreeType.HIGH_SCHOOL;

    return DegreeType.BACHELOR; // default
  }

  private mapCountryCode(countryCode?: string): string {
    if (!countryCode) return 'Unknown';

    const countryMap: Record<string, string> = {
      VN: 'Vietnam',
      US: 'United States',
      SG: 'Singapore',
      TH: 'Thailand',
      MY: 'Malaysia',
      ID: 'Indonesia',
      PH: 'Philippines',
      JP: 'Japan',
      KR: 'South Korea',
      CN: 'China',
      IN: 'India',
      AU: 'Australia',
      GB: 'United Kingdom',
      DE: 'Germany',
      FR: 'France',
      CA: 'Canada',
    };

    return countryMap[countryCode] || countryCode;
  }

  private clearCaches(): void {
    this.userCache.clear();
    this.orgCache.clear();
    this.industryCache.clear();
    this.systemUser = null;
  }
}
