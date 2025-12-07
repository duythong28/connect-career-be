// src/modules/search/infrastructure/elasticsearch/elasticsearch.service.ts
import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { Job } from 'src/modules/jobs/domain/entities/job.entity';
import { Organization } from 'src/modules/profile/domain/entities/organization.entity';
import { User } from 'src/modules/identity/domain/entities/user.entity';

@Injectable()
export class ElasticsearchService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchService.name);
  private readonly JOB_INDEX = 'jobs_index';
  private readonly ORGANIZATION_INDEX = 'organizations_index';
  private readonly PEOPLE_INDEX = 'people_index';

  constructor(
    @Inject('ELASTICSEARCH_CLIENT')
    private readonly client: Client,
  ) {}

  async onModuleInit() {
    await this.ensureIndicesExist();
  }

  private async ensureIndicesExist() {
    await Promise.all([
      this.createJobIndex(),
      this.createOrganizationIndex(),
      this.createPeopleIndex(),
    ]);
  }

  private async createJobIndex() {
    const exists = await this.client.indices.exists({ index: this.JOB_INDEX });
    if (exists) return;

    await this.client.indices.create({
      index: this.JOB_INDEX,
      settings: {
        number_of_shards: 3,
        number_of_replicas: 1,
        analysis: {
          analyzer: {
            job_analyzer: {
              type: 'custom',
              tokenizer: 'standard',
              filter: ['lowercase', 'stop', 'snowball'],
            },
          },
        },
      },
      mappings: {
        properties: {
          id: { type: 'keyword' },
          title: {
            type: 'text',
            analyzer: 'job_analyzer',
            fields: {
              keyword: { type: 'keyword' },
              suggest: { type: 'completion' },
            },
          },
          description: { type: 'text', analyzer: 'job_analyzer' },
          summary: { type: 'text' },
          company: {
            properties: {
              id: { type: 'keyword' },
              name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              logo: { type: 'keyword' },
            },
          },
          location: {
            type: 'text',
            fields: {
              keyword: { type: 'keyword' },
            },
          },
          countryCode: { type: 'keyword' },
          type: { type: 'keyword' },
          seniorityLevel: { type: 'keyword' },
          jobFunction: { type: 'keyword' },
          keywords: { type: 'keyword' },
          salary: {
            properties: {
              min: { type: 'integer' },
              max: { type: 'integer' },
              currency: { type: 'keyword' },
            },
          },
          remote: { type: 'boolean' },
          status: { type: 'keyword' },
          source: { type: 'keyword' },
          postedDate: { type: 'date' },
          applications: { type: 'integer' },
          views: { type: 'integer' },
          popularityScore: { type: 'float' },
          createdAt: { type: 'date' },
          updatedAt: { type: 'date' },
          indexedAt: { type: 'date' },
        },
      },
    });

    this.logger.log(`Created index: ${this.JOB_INDEX}`);
  }

  private async createOrganizationIndex() {
    const exists = await this.client.indices.exists({ index: this.ORGANIZATION_INDEX });
    if (exists) return;

    await this.client.indices.create({
      index: this.ORGANIZATION_INDEX,
      settings: {
        number_of_shards: 3,
        number_of_replicas: 1,
        analysis: {
          analyzer: {
            organization_analyzer: {
              type: 'custom',
              tokenizer: 'standard',
              filter: ['lowercase', 'stop', 'snowball'],
            },
          },
        },
      },
      mappings: {
        properties: {
          id: { type: 'keyword' },
          name: {
            type: 'text',
            analyzer: 'organization_analyzer',
            fields: {
              keyword: { type: 'keyword' },
              suggest: { type: 'completion' },
            },
          },
          abbreviation: { type: 'keyword' },
          tagline: { type: 'text' },
          shortDescription: { type: 'text' },
          longDescription: { type: 'text' },
          industry: {
            properties: {
              id: { type: 'keyword' },
              name: { type: 'keyword' },
            },
          },
          subIndustries: { type: 'keyword' },
          size: { type: 'keyword' },
          employeeCount: { type: 'integer' },
          location: {
            properties: {
              country: { type: 'keyword' },
              state: { type: 'keyword' },
              city: { type: 'keyword' },
            },
          },
          type: { type: 'keyword' },
          coreValues: { type: 'keyword' },
          benefits: { type: 'text' },
          culture: { type: 'text' },
          logo: { type: 'keyword' },
          website: { type: 'keyword' },
          activeJobsCount: { type: 'integer' },
          createdAt: { type: 'date' },
          updatedAt: { type: 'date' },
          indexedAt: { type: 'date' },
        },
      },
    });

    this.logger.log(`Created index: ${this.ORGANIZATION_INDEX}`);
  }

  private async createPeopleIndex() {
    const exists = await this.client.indices.exists({ index: this.PEOPLE_INDEX });
    if (exists) return;

    await this.client.indices.create({
      index: this.PEOPLE_INDEX,
      settings: {
        number_of_shards: 3,
        number_of_replicas: 1,
        analysis: {
          analyzer: {
            people_analyzer: {
              type: 'custom',
              tokenizer: 'standard',
              filter: ['lowercase', 'stop', 'snowball'],
            },
          },
        },
      },
      mappings: {
        properties: {
          id: { type: 'keyword' },
          name: {
            type: 'text',
            analyzer: 'people_analyzer',
            fields: {
              keyword: { type: 'keyword' },
            },
          },
          firstName: { type: 'keyword' },
          lastName: { type: 'keyword' },
          title: { type: 'text' },
          currentCompany: {
            properties: {
              id: { type: 'keyword' },
              name: { type: 'keyword' },
            },
          },
          location: { type: 'keyword' },
          skills: { type: 'keyword' },
          experience: {
            type: 'nested',
            properties: {
              company: { type: 'keyword' },
              title: { type: 'text' },
              duration: { type: 'integer' },
            },
          },
          education: {
            type: 'nested',
            properties: {
              school: { type: 'keyword' },
              degree: { type: 'keyword' },
            },
          },
          avatarUrl: { type: 'keyword' },
          profileUrl: { type: 'keyword' },
          createdAt: { type: 'date' },
          updatedAt: { type: 'date' },
          indexedAt: { type: 'date' },
        },
      },
    });

    this.logger.log(`Created index: ${this.PEOPLE_INDEX}`);
  }

  async indexJob(job: Job): Promise<void> {
    try {
      const document = this.transformJobToDocument(job);
      
      await this.client.index({
        index: this.JOB_INDEX,
        id: job.id,
        document: {
          ...document,
          indexedAt: new Date(),
        },
        refresh: 'wait_for',
      });
      
      this.logger.log(`Indexed job: ${job.id}`);
    } catch (error) {
      this.logger.error(`Failed to index job ${job.id}:`, error);
      throw error;
    }
  }

  async deleteJob(jobId: string): Promise<void> {
    try {
      await this.client.delete({
        index: this.JOB_INDEX,
        id: jobId,
      });
      this.logger.log(`Deleted job from index: ${jobId}`);
    } catch (error: unknown) {
      const esError = error as { statusCode?: number };
      if (esError.statusCode !== 404) {
        this.logger.error(`Failed to delete job ${jobId}:`, error);
        throw error;
      }
    }
  }

  async indexOrganization(organization: Organization): Promise<void> {
    try {
      const document = this.transformOrganizationToDocument(organization);
      
      await this.client.index({
        index: this.ORGANIZATION_INDEX,
        id: organization.id,
        document: {
          ...document,
          indexedAt: new Date(),
        },
        refresh: 'wait_for',
      });
      
      this.logger.log(`Indexed organization: ${organization.id}`);
    } catch (error) {
      this.logger.error(`Failed to index organization ${organization.id}:`, error);
      throw error;
    }
  }

  async deleteOrganization(organizationId: string): Promise<void> {
    try {
      await this.client.delete({
        index: this.ORGANIZATION_INDEX,
        id: organizationId,
      });
      this.logger.log(`Deleted organization from index: ${organizationId}`);
    } catch (error: unknown) {
      const esError = error as { statusCode?: number };
      if (esError.statusCode !== 404) {
        this.logger.error(`Failed to delete organization ${organizationId}:`, error);
        throw error;
      }
    }
  }

  async indexPerson(user: User): Promise<void> {
    try {
      const document = this.transformUserToDocument(user);
      
      await this.client.index({
        index: this.PEOPLE_INDEX,
        id: user.id,
        document: {
          ...document,
          indexedAt: new Date(),
        },
        refresh: 'wait_for',
      });
      
      this.logger.log(`Indexed person: ${user.id}`);
    } catch (error) {
      this.logger.error(`Failed to index person ${user.id}:`, error);
      throw error;
    }
  }

  async deletePerson(userId: string): Promise<void> {
    try {
      await this.client.delete({
        index: this.PEOPLE_INDEX,
        id: userId,
      });
      this.logger.log(`Deleted person from index: ${userId}`);
    } catch (error: unknown) {
      const esError = error as { statusCode?: number };
      if (esError.statusCode !== 404) {
        this.logger.error(`Failed to delete person ${userId}:`, error);
        throw error;
      }
    }
  }

  private transformJobToDocument(job: Job): Record<string, unknown> {
    return {
      id: job.id,
      title: job.title,
      description: job.description,
      summary: job.summary,
      company: {
        id: job.organizationId,
        name: job.companyName || null,
        logo: job.companyLogo || null,
      },
      location: job.location,
      countryCode: job.countryCode,
      type: job.type,
      seniorityLevel: job.seniorityLevel,
      jobFunction: job.jobFunction,
      keywords: job.keywords || [],
      salary: job.salaryDetails ? {
        min: job.salaryDetails.minAmount,
        max: job.salaryDetails.maxAmount,
        currency: job.salaryDetails.currency,
      } : null,
      remote: job.location?.toLowerCase().includes('remote') || false,
      status: job.status,
      source: job.source,
      postedDate: job.postedDate,
      applications: job.applications || 0,
      views: job.views || 0,
      popularityScore: this.calculatePopularityScore(job),
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  private transformOrganizationToDocument(organization: Organization): Record<string, unknown> {
    return {
      id: organization.id,
      name: organization.name,
      abbreviation: organization.abbreviation,
      tagline: organization.tagline,
      shortDescription: organization.shortDescription,
      longDescription: organization.longDescription,
      industry: organization.industry ? {
        id: organization.industryId,
        name: (organization.industry as { name?: string }).name || null,
      } : null,
      subIndustries: organization.subIndustries || [],
      size: organization.organizationSize,
      employeeCount: organization.employeeCount,
      location: {
        country: organization.country,
        state: organization.stateProvince,
        city: organization.city,
      },
      type: organization.organizationType,
      coreValues: organization.coreValues || [],
      benefits: organization.benefits ? JSON.stringify(organization.benefits) : null,
      culture: organization.culture ? JSON.stringify(organization.culture) : null,
      logo: (organization.logoFile as { url?: string } | undefined)?.url || null,
      website: organization.website,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  }

  private transformUserToDocument(user: User): Record<string, unknown> {
    const profile = user.candidateProfile;
    
    // Get current company from work experience
    let currentCompany: { id: string; name: string | null } | null = null;
    if (profile?.workExperiences && profile.workExperiences.length > 0) {
      // Find current job first, otherwise get the most recent one
      const currentJob = profile.workExperiences.find(exp => exp.isCurrent);
      const mostRecentJob = profile.workExperiences.sort((a, b) => {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return dateB - dateA;
      })[0];
      
      const jobToUse = currentJob || mostRecentJob;
      if (jobToUse?.organization) {
        const org = jobToUse.organization as { name?: string };
        currentCompany = {
          id: jobToUse.organizationId,
          name: org?.name || null,
        };
      }
    }

    // Get skills from profile
    const skills = profile?.skills || [];

    // Transform work experiences
    const experience = (profile?.workExperiences || []).map(exp => {
      const org = exp.organization as { name?: string } | undefined;
      return {
        company: org?.name || null,
        title: exp.jobTitle,
        duration: exp.durationInMonths || 0,
      };
    });

    // Transform education
    const education = (profile?.educations || []).map(edu => ({
      school: edu.institutionName,
      degree: edu.degreeType,
    }));

    // Construct location from profile
    const locationParts: string[] = [];
    if (profile?.city) locationParts.push(profile.city);
    if (profile?.country) locationParts.push(profile.country);
    const location = locationParts.length > 0 ? locationParts.join(', ') : null;

    return {
      id: user.id,
      name: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      firstName: user.firstName,
      lastName: user.lastName,
      title: null,
      currentCompany,
      location,
      skills,
      experience,
      education,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private calculatePopularityScore(job: Job): number {
    const views = job.views || 0;
    const applications = job.applications || 0;
    const daysSincePosted = job.postedDate 
      ? Math.max(1, Math.floor((Date.now() - new Date(job.postedDate).getTime()) / (1000 * 60 * 60 * 24)))
      : 365;
    
    // Score based on views, applications, and recency
    const viewScore = Math.log10(views + 1) * 10;
    const applicationScore = applications * 5;
    const recencyScore = Math.max(0, 100 - daysSincePosted);
    
    return viewScore + applicationScore + recencyScore;
  }

  getClient(): Client {
    return this.client;
  }

  getJobIndex(): string {
    return this.JOB_INDEX;
  }

  getOrganizationIndex(): string {
    return this.ORGANIZATION_INDEX;
  }

  getPeopleIndex(): string {
    return this.PEOPLE_INDEX;
  }
}