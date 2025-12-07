import { Injectable, Logger } from '@nestjs/common';
import {
  Organization,
  OrganizationSize,
  OrganizationType,
  OvertimePolicy,
  WorkingDay,
} from '../../domain/entities/organization.entity';
import { chain } from 'stream-chain';
import * as fs from 'fs';
import { parser } from 'stream-json';
import { streamArray } from 'stream-json/streamers/StreamArray';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/modules/identity/domain/entities';
import {
  File,
  FileStatus,
  FileType,
} from 'src/shared/infrastructure/external-services/file-system/domain/entities/file.entity';
import { Industry } from '../../domain/entities/industry.entity';

type LinkedInCompany = {
  name?: string;
  website?: string;
  about?: string;
  logo?: string;
  locations?: string[];
  country_code?: string;
  company_size?: string;
  organization_type?: string;
  industries?: string;
  founded?: string;
  headquarters?: string;
  description?: string;
  slogan?: string;
  unformatted_about?: string;
  formatted_locations?: string[];
  url?: string;
  country_codes_array?: string[];
  employees_in_linkedin?: number;
};

@Injectable()
export class LinkedInCompanySeeder {
  private readonly logger = new Logger(LinkedInCompanySeeder.name);
  private readonly BATCH_SIZE = 100;
  private industryCache = new Map<string, Industry>();

  constructor(
    @InjectRepository(Organization)
    private readonly orgRepository: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Industry)
    private readonly industryRepository: Repository<Industry>,
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
  ) {}

  async seedFromFile(filePath: string): Promise<void> {
    this.logger.log(`Seeding LinkedIn companies from ${filePath}...`);

    // Get or create a system user for organizations
    const systemUser = await this.getOrCreateSystemUser();

    const defaultIndustry = await this.getDefaultIndustry();
    this.industryCache.set('__DEFAULT__', defaultIndustry);

    let count = 0;
    let skipped = 0;
    const batch: any[] = [];
    let processing = false;

    await new Promise<void>((resolve, reject) => {
      const pipeline = chain([
        fs.createReadStream(filePath, { encoding: 'utf8' }),
        parser({} as any) as any,
        streamArray() as any,
      ]);

      pipeline.on('data', (data: { key: number; value: LinkedInCompany }) => {
        if (processing) return;

        const raw = data.value;

        if (!raw?.name) {
          skipped++;
          return;
        }

        pipeline.pause();
        processing = true;

        void (async () => {
          try {
            const orgData = await this.mapCompanyToPlainObject(
              raw,
              systemUser.id,
            );
            if (orgData) {
              batch.push(orgData);
              count++;

              if (batch.length >= this.BATCH_SIZE) {
                await this.orgRepository
                  .createQueryBuilder()
                  .insert()
                  .into(Organization)
                  .values(batch)
                  .orIgnore()
                  .execute();

                this.logger.log(
                  `✅ Saved batch (total: ${count}, skipped: ${skipped})`,
                );
                batch.length = 0;

                if (global.gc) global.gc();
              }
            } else {
              skipped++;
            }
          } catch (err) {
            this.logger.error(`Error: ${err.message}`);
            skipped++;
          } finally {
            processing = false;
            pipeline.resume();
          }
        })();
      });

      pipeline.on('end', () => {
        void (async () => {
          try {
            while (processing) {
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
            if (batch.length) {
              await this.orgRepository
                .createQueryBuilder()
                .insert()
                .into(Organization)
                .values(batch)
                .orIgnore()
                .execute();
            }
            this.logger.log(
              `✅ Complete! Seeded ${count} companies (skipped: ${skipped})`,
            );
            this.industryCache.clear();
            resolve();
          } catch (e) {
            reject(e instanceof Error ? e : new Error(String(e)));
          }
        })();
      });

      pipeline.on('error', reject);
    });
  }

  private async getOrCreateSystemUser(): Promise<User> {
    const systemEmail = 'system@connect-career.com';
    let systemUser = await this.userRepository.findOne({
      where: { email: systemEmail },
    });

    if (!systemUser) {
      systemUser = this.userRepository.create({
        email: systemEmail,
        firstName: 'System',
        lastName: 'User',
        emailVerified: true,
        isActive: true,
      });
      systemUser = await this.userRepository.save(systemUser);
      this.logger.log('Created system user for organizations');
    }

    return systemUser;
  }

  private async mapCompanyToPlainObject(
    src: LinkedInCompany,
    userId: string,
  ): Promise<any | null> {
    if (!src?.name) return null;

    const industry = await this.findOrCreateIndustry(src.industries);
    const hq = this.parseHQ(src.headquarters);

    let logoFileId: string | null = null;
    if (src.logo) {
      try {
        const logoFile = this.createLogoFile(src.logo, userId);
        const savedLogoFile = await this.fileRepository.save(logoFile);
        logoFileId = savedLogoFile.id;
      } catch (error) {
        this.logger.warn(
          `Failed to save logo for ${src.name}: ${error.message}`,
        );
      }
    }

    return {
      userId: userId,
      industryId: industry?.id,
      name: src.name,
      logoFileId: logoFileId,
      organizationType: this.mapOrganizationType(src.organization_type),
      organizationSize: this.mapOrganizationSize(src.company_size),
      employeeCount: src.employees_in_linkedin ?? null,
      country: this.mapCountryCode(src.country_code),
      stateProvince: hq.state,
      city: hq.city,
      headquartersAddress:
        src.formatted_locations?.[0] || src.locations?.[0] || null,
      workingDays: [
        WorkingDay.MONDAY,
        WorkingDay.TUESDAY,
        WorkingDay.WEDNESDAY,
        WorkingDay.THURSDAY,
        WorkingDay.FRIDAY,
      ],
      overtimePolicy: OvertimePolicy.NO_OVERTIME,
      workScheduleTypes: [],
      tagline: src.slogan,
      shortDescription: src.about,
      longDescription: src.unformatted_about || src.description,
      website: src.website,
      socialMedia: src.url ? { linkedin: src.url } : null,
      keywords: [
        ...(src.industries ? src.industries.split(/\s+/) : []),
        ...(src.country_codes_array ?? []),
      ]
        .filter(Boolean)
        .slice(0, 10),
      isActive: true,
      isPublic: true,
    };
  }

  private createLogoFile(logoUrl: string, userId: string): File {
    const urlParts = logoUrl.split('/');
    const fileName = urlParts[urlParts.length - 1] || 'logo.jpg';

    return this.fileRepository.create({
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

    let industry = await this.industryRepository.findOneBy({
      name: industryName.trim(),
    });

    if (!industry) {
      industry = this.industryRepository.create({
        name: industryName.trim(),
        description: `Industry for ${industryName}`,
        keywords: [industryName.toLowerCase()],
        isActive: true,
      });
      industry = await this.industryRepository.save(industry);
    }
    this.industryCache.set(cacheKey, industry);
    return industry;
  }
  private async getDefaultIndustry(): Promise<Industry> {
    let defaultIndustry = await this.industryRepository.findOne({
      where: { name: 'Other' },
    });

    if (!defaultIndustry) {
      defaultIndustry = this.industryRepository.create({
        name: 'Other',
        description: 'Default industry for companies without specific industry',
        keywords: ['other', 'general'],
        isActive: true,
      });
      defaultIndustry = await this.industryRepository.save(defaultIndustry);
    }

    return defaultIndustry;
  }
  private mapOrganizationSize(size?: string): OrganizationSize {
    if (!size) return OrganizationSize.STARTUP;

    const sizeMap: Record<string, OrganizationSize> = {
      '1-10 employees': OrganizationSize.STARTUP,
      '11-50 employees': OrganizationSize.SMALL,
      '51-200 employees': OrganizationSize.MEDIUM,
      '201-1000 employees': OrganizationSize.LARGE,
      '1001+ employees': OrganizationSize.ENTERPRISE,
    };
    return sizeMap[size] || OrganizationSize.STARTUP;
  }

  private mapOrganizationType(type?: string): OrganizationType {
    if (!type) return OrganizationType.OTHER;

    const typeMap: Record<string, OrganizationType> = {
      Partnership: OrganizationType.PARTNERSHIP,
      Corporation: OrganizationType.CORPORATION,
      LLC: OrganizationType.LLC,
      'Non-Profit': OrganizationType.NON_PROFIT,
      Government: OrganizationType.GOVERNMENT,
      Startup: OrganizationType.STARTUP,
      Agency: OrganizationType.AGENCY,
      Consulting: OrganizationType.CONSULTING,
      Freelance: OrganizationType.FREELANCE,
    };

    return typeMap[type] || OrganizationType.OTHER;
  }
  private parseHQ(hq?: string | null): {
    city: string | null;
    state: string | null;
  } {
    if (!hq) return { city: null, state: null };
    const [city, state] = hq.split(',').map((s) => s.trim());
    return { city: city ?? null, state: state ?? null };
  }
  private extractPostal(addr?: string | null): string | null {
    if (!addr) return null;
    const m = addr.match(/\b(\d{4,6})\b/);
    return m ? m[1] : null;
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
}
