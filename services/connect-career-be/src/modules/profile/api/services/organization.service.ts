import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as organizationEntity from '../../domain/repository/organization.repository';
import { Organization } from '../../domain/entities/organization.entity';
import { CreateOrganizationDto } from '../dtos/create-organization.dto';
import { UpdateOrganizationDto } from '../dtos/update-organization.dto';
import {
  OrganizationQueryDto,
  OrganizationSearchDto,
} from '../dtos/organization-query.dto';
import { FindOptionsWhere, Repository } from 'typeorm';
import { OrganizationRBACService } from './organization-rbac.service';
import { InjectRepository } from '@nestjs/typeorm';
import { OrganizationRole } from '../../domain/entities/organization-memberships.entity';
import {
  Interview,
  InterviewStatus,
} from 'src/modules/applications/domain/entities/interview.entity';
import { Job } from 'src/modules/jobs/domain/entities/job.entity';
import { OrganizationReview } from '../../domain/entities/organization-reviews.entity';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly organizationRepository: organizationEntity.OrganizationRepository,
    @InjectRepository(OrganizationRole)
    private readonly roleRepository: Repository<OrganizationRole>,
    private readonly organizationRBACService: OrganizationRBACService,
    @InjectRepository(Interview)
    private readonly interviewRepository: Repository<Interview>,
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
  ) {}

  async createOrganization(
    userId: string,
    dto: CreateOrganizationDto,
  ): Promise<Organization> {
    return this.organizationRBACService.createOrganizationWithOwner(
      userId,
      dto,
    );
  }

  async updateOrganizationById(
    userId: string,
    id: string,
    dto: UpdateOrganizationDto,
  ): Promise<Organization> {
    // const existingOrganization = await this.organizationRepository.findByUserId(userId);
    // if (!existingOrganization) {
    //   throw new NotFoundException('Organization not found');
    // }
    const organization = await this.organizationRepository.findById(id);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    const updateData: Partial<Organization> = { ...dto };
    const updatedOrganization = await this.organizationRepository.update(
      id,
      updateData,
    );
    if (!updatedOrganization) {
      throw new NotFoundException(
        'Organization not found or could not be updated',
      );
    }

    return updatedOrganization;
  }

  async getOrganizationById(id: string): Promise<Organization> {
    const organization = await this.organizationRepository.findById(id);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    if (!organization.isPublic && !organization.isActive) {
      throw new NotFoundException('Organization not found');
    }
    return organization;
  }

  async getMyOrganizations(userId: string): Promise<Organization[]> {
    const organizations =
      await this.organizationRepository.findByUserId(userId);
    if (!organizations) {
      throw new NotFoundException('Organizations not found');
    }
    return [organizations];
  }

  async getAllOrganizations(query: OrganizationQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      industryId,
      country,
      city,
      organizationSize,
      organizationType,
      isHiring,
      isVerified,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    if (search) {
      const organizations =
        await this.organizationRepository.searchOrganizations(search);
      const total = organizations.length;
      const skip = (page - 1) * limit;
      const data = organizations.slice(skip, skip + limit);

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    const where: FindOptionsWhere<Organization> = {
      isPublic: true,
      isActive: true,
    };

    if (industryId !== undefined) where.industryId = industryId;
    if (country !== undefined) where.country = country;
    if (city !== undefined) where.city = city;
    if (organizationSize !== undefined)
      where.organizationSize = organizationSize;
    if (organizationType !== undefined)
      where.organizationType = organizationType;
    if (isHiring !== undefined) where.isHiring = isHiring;
    if (isVerified !== undefined) where.isVerified = isVerified;
    const relations = ['user', 'locations', 'logoFile', 'bannerFile'];
    const sortField = sortBy as keyof Organization;
    return this.organizationRepository.findPaginated(
      { page, limit, sortBy: sortField, sortOrder },
      where,
      relations,
    );
  }

  async searchOrganizations(searchDto: OrganizationSearchDto) {
    const {
      search,
      industryIds,
      country,
      city,
      organizationSize,
      organizationType,
      isHiring,
      isVerified,
      minEmployeeCount,
      maxEmployeeCount,
      workScheduleTypes,
      page = 1,
      limit = 20,
    } = searchDto;

    const organizations =
      await this.organizationRepository.advancedSearchByJobCount({
        searchTerm: search,
        industryIds,
        country,
        city,
        organizationSize,
        organizationType,
        isHiring,
        isVerified,
        minEmployeeCount,
        maxEmployeeCount,
        workScheduleTypes,
      });
    const total = organizations.length;
    const skip = (page - 1) * limit;
    const data = organizations.slice(skip, skip + limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      filters: {
        search,
        industryIds,
        country,
        city,
        organizationSize,
        organizationType,
        isHiring,
        isVerified,
        minEmployeeCount,
        maxEmployeeCount,
        workScheduleTypes,
      },
    };
  }

  async quickSearch(searchTerm: string, limit: number = 10) {
    const organizations =
      await this.organizationRepository.searchOrganizations(searchTerm);

    return organizations.slice(0, limit).map((org) => ({
      id: org.id,
      name: org.name,
      abbreviation: org.abbreviation,
      logo: org.logoFile?.secureUrl,
      isVerified: org.isVerified,
      city: org.city,
      country: org.country,
      organizationSize: org.organizationSize,
    }));
  }

  async getInterviewsByOrganization(
    organizationId: string,
    options?: {
      status?: InterviewStatus;
      startDate?: Date;
      endDate?: Date;
      jobId?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{
    data: Interview[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Verify organization exists
    const organization =
      await this.organizationRepository.findById(organizationId);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    // Build query
    const queryBuilder = this.interviewRepository
      .createQueryBuilder('interview')
      .innerJoin('interview.application', 'application')
      .innerJoin('application.job', 'job')
      .where('job.organizationId = :organizationId', { organizationId })
      .leftJoinAndSelect('interview.application', 'app')
      .leftJoinAndSelect('app.job', 'jobDetails')
      .leftJoinAndSelect('app.candidate', 'candidate')
      .leftJoinAndSelect('interview.interviewer', 'interviewer')
      .orderBy('interview.scheduledDate', 'DESC');

    // Apply filters
    if (options?.status) {
      queryBuilder.andWhere('interview.status = :status', {
        status: options.status,
      });
    }

    if (options?.startDate) {
      queryBuilder.andWhere('interview.scheduledDate >= :startDate', {
        startDate: options.startDate,
      });
    }

    if (options?.endDate) {
      queryBuilder.andWhere('interview.scheduledDate <= :endDate', {
        endDate: options.endDate,
      });
    }

    if (options?.jobId) {
      queryBuilder.andWhere('job.id = :jobId', { jobId: options.jobId });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const data = await queryBuilder.skip(skip).take(limit).getMany();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async getUpcomingInterviewsByOrganization(
    organizationId: string,
    options?: {
      daysAhead?: number;
      jobId?: string;
      limit?: number;
    },
  ): Promise<Interview[]> {
    const organization =
      await this.organizationRepository.findById(organizationId);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const now = new Date();
    const daysAhead = options?.daysAhead || 30;
    const endDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    const limit = options?.limit || 50;

    const queryBuilder = this.interviewRepository
      .createQueryBuilder('interview')
      .innerJoin('interview.application', 'application')
      .innerJoin('application.job', 'job')
      .where('job.organizationId = :organizationId', { organizationId })
      .andWhere('interview.scheduledDate >= :now', { now })
      .andWhere('interview.scheduledDate <= :endDate', { endDate })
      .andWhere('interview.status IN (:...statuses)', {
        statuses: [InterviewStatus.SCHEDULED, InterviewStatus.RESCHEDULED],
      })
      .leftJoinAndSelect('interview.application', 'app')
      .leftJoinAndSelect('app.job', 'jobDetails')
      .leftJoinAndSelect('app.candidate', 'candidate')
      .leftJoinAndSelect('interview.interviewer', 'interviewer')
      .orderBy('interview.scheduledDate', 'ASC')
      .take(limit);

    if (options?.jobId) {
      queryBuilder.andWhere('job.id = :jobId', { jobId: options.jobId });
    }

    return queryBuilder.getMany();
  }
}
