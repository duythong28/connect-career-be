import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from 'src/modules/profile/domain/entities/organization.entity';
import {
  OrganizationMembership,
  MembershipStatus,
} from 'src/modules/profile/domain/entities/organization-memberships.entity';
import { Job, JobStatus } from 'src/modules/jobs/domain/entities/job.entity';
import {
  Application,
  ApplicationStatus,
} from 'src/modules/applications/domain/entities/application.entity';
import {
  OrganizationListQueryDto,
  UpdateOrganizationStatusDto,
  OrganizationResponse,
} from '../dtos/organization-management.dto';

@Injectable()
export class OrganizationManagementService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationMembership)
    private readonly membershipRepository: Repository<OrganizationMembership>,
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
  ) {}

  async getOrganizations(query: OrganizationListQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder =
      this.organizationRepository.createQueryBuilder('organization');

    if (query.search) {
      queryBuilder.andWhere('organization.name ILIKE :search', {
        search: `%${query.search}%`,
      });
    }

    if (query.isVerified !== undefined) {
      queryBuilder.andWhere('organization.isVerified = :isVerified', {
        isVerified: query.isVerified,
      });
    }

    if (query.isActive !== undefined) {
      queryBuilder.andWhere('organization.isActive = :isActive', {
        isActive: query.isActive,
      });
    }

    queryBuilder
      .leftJoinAndSelect('organization.industry', 'industry')
      .leftJoinAndSelect('organization.logoFile', 'logoFile')
      .leftJoinAndSelect('organization.bannerFile', 'bannerFile')
      .leftJoinAndSelect('organization.locations', 'locations')
      .leftJoinAndSelect('organization.memberships', 'memberships')
      .leftJoinAndSelect('organization.files', 'files')
      .leftJoin('organization.user', 'user')
      .addSelect([
        'user.id',
        'user.email',
        'user.firstName',
        'user.lastName',
        'user.fullName',
        'user.avatarUrl',
      ]);
      
    const [data, total] = await queryBuilder
      .orderBy('organization.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();
    const organizations = await Promise.all(
      data.map(async (org) => await this.mapToOrganizationResponse(org)),
    );

    return {
      data: organizations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOrganizationById(
    organizationId: string,
  ): Promise<OrganizationResponse> {
    const organization = await this.organizationRepository
      .createQueryBuilder('organization')
      .leftJoinAndSelect('organization.industry', 'industry')
      .leftJoinAndSelect('organization.logoFile', 'logoFile')
      .leftJoinAndSelect('organization.bannerFile', 'bannerFile')
      .leftJoinAndSelect('organization.locations', 'locations')
      .leftJoinAndSelect('organization.memberships', 'memberships')
      .leftJoinAndSelect('organization.files', 'files')
      .leftJoin('organization.user', 'user')
      .addSelect([
        'user.id',
        'user.email',
        'user.firstName',
        'user.lastName',
        'user.fullName',
        'user.avatarUrl',
      ])
      .where('organization.id = :organizationId', { organizationId })
      .getOne();

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    return this.mapToOrganizationResponse(organization);
  }


  async updateOrganizationStatus(
    organizationId: string,
    updateDto: UpdateOrganizationStatusDto,
  ): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (updateDto.isVerified !== undefined) {
      organization.isVerified = updateDto.isVerified;
    }

    if (updateDto.isActive !== undefined) {
      organization.isActive = updateDto.isActive;
    }

    const result = await this.organizationRepository.save(organization);
    return result;
  }

  private async mapToOrganizationResponse(organization: Organization): Promise<{
    organization: Organization;
    stats: {
      totalJobs: number;
      activeJobs: number;
      totalApplications: number;
      totalHires: number;
      totalMembers: number;
      totalRecruiters: number;
    };
  }> {
    const [
      totalJobs,
      activeJobs,
      totalApplications,
      totalHires,
      totalMembers,
      totalRecruiters,
    ] = await Promise.all([
      this.jobRepository.count({
        where: { organizationId: organization.id },
      }),
      this.jobRepository.count({
        where: { organizationId: organization.id, status: JobStatus.ACTIVE },
      }),
      this.applicationRepository
        .createQueryBuilder('application')
        .innerJoin('application.job', 'job')
        .where('job.organizationId = :organizationId', {
          organizationId: organization.id,
        })
        .getCount(),
      this.applicationRepository
        .createQueryBuilder('application')
        .innerJoin('application.job', 'job')
        .where('job.organizationId = :organizationId', {
          organizationId: organization.id,
        })
        .andWhere('application.status = :status', {
          status: ApplicationStatus.HIRED,
        })
        .getCount(),
      this.membershipRepository.count({
        where: {
          organizationId: organization.id,
          status: MembershipStatus.ACTIVE,
        },
      }),
      this.membershipRepository
        .createQueryBuilder('membership')
        .innerJoin('membership.role', 'role')
        .where('membership.organizationId = :organizationId', {
          organizationId: organization.id,
        })
        .andWhere('membership.status = :status', {
          status: MembershipStatus.ACTIVE,
        })
        .andWhere('role.name IN (:...roles)', {
          roles: ['recruiter', 'hr_manager', 'admin', 'owner'],
        })
        .getCount(),
    ]);

    return {
      organization,
      stats: {
        totalJobs,
        activeJobs,
        totalApplications,
        totalHires,
        totalMembers,
        totalRecruiters,
      },
    };
  }
}
