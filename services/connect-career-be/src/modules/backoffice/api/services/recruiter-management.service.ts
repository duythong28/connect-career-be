import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  OrganizationMembership,
  MembershipStatus,
} from 'src/modules/profile/domain/entities/organization-memberships.entity';
import { Organization } from 'src/modules/profile/domain/entities/organization.entity';
import { User } from 'src/modules/identity/domain/entities';
import { Job } from 'src/modules/jobs/domain/entities/job.entity';
import {
  Application,
  ApplicationStatus,
} from 'src/modules/applications/domain/entities/application.entity';
import {
  RecruiterListQueryDto,
  UpdateRecruiterDto,
  AssignRecruiterToOrganizationDto,
  RecruiterResponse,
} from '../dtos/recruiter-management.dto';

@Injectable()
export class RecruiterManagementService {
  constructor(
    @InjectRepository(OrganizationMembership)
    private readonly membershipRepository: Repository<OrganizationMembership>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
  ) {}

  async getRecruiters(query: RecruiterListQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.membershipRepository
      .createQueryBuilder('membership')
      .innerJoinAndSelect('membership.user', 'user')
      .innerJoinAndSelect('membership.role', 'role')
      .innerJoinAndSelect('membership.organization', 'organization')
      .where('role.name IN (:...roles)', {
        roles: ['recruiter', 'hr_manager', 'admin', 'owner'],
      });

    if (query.search) {
      queryBuilder.andWhere(
        '("user"."fullName" ILIKE :search OR "user"."email" ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.organizationId) {
      queryBuilder.andWhere('membership.organizationId = :organizationId', {
        organizationId: query.organizationId,
      });
    }

    if (query.status) {
      queryBuilder.andWhere('membership.status = :status', {
        status: query.status,
      });
    }

    const [data, total] = await queryBuilder
      .orderBy('membership.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getRecruiterById(
    membershipId: string,
  ): Promise<OrganizationMembership> {
    const membership = await this.membershipRepository.findOne({
      where: { id: membershipId },
      relations: ['user', 'role', 'organization'],
    });

    if (!membership) {
      throw new NotFoundException('Recruiter membership not found');
    }
    return membership;
  }

  async updateRecruiter(
    membershipId: string,
    updateDto: UpdateRecruiterDto,
    adminId: string,
  ): Promise<OrganizationMembership | undefined> {
    const membership = await this.membershipRepository.findOne({
      where: { id: membershipId },
      relations: ['user', 'role', 'organization'],
    });

    if (!membership) {
      throw new NotFoundException('Recruiter membership not found');
    }

    if (updateDto.status) {
      membership.status = updateDto.status;
    }

    if (updateDto.roleId) {
      const role = await this.membershipRepository.manager
        .getRepository('OrganizationRole')
        .findOne({ where: { id: updateDto.roleId } });

      if (!role) {
        throw new NotFoundException('Role not found');
      }

      membership.roleId = updateDto.roleId;
    }

    if (updateDto.removeFromOrganization) {
      await this.membershipRepository.remove(membership);
      return undefined;
    }

    await this.membershipRepository.save(membership);
  }

  async assignRecruiterToOrganization(
    userId: string,
    assignDto: AssignRecruiterToOrganizationDto,
    adminId: string,
  ): Promise<OrganizationMembership> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const organization = await this.organizationRepository.findOne({
      where: { id: assignDto.organizationId },
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if already a member
    const existing = await this.membershipRepository.findOne({
      where: {
        userId,
        organizationId: assignDto.organizationId,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'User is already a member of this organization',
      );
    }

    const membership = this.membershipRepository.create({
      userId,
      organizationId: assignDto.organizationId,
      roleId: assignDto.roleId,
      status: MembershipStatus.ACTIVE,
      invitedBy: adminId,
      invitedAt: new Date(),
      joinedAt: new Date(),
    });

    await this.membershipRepository.save(membership);

    return this.getRecruiterById(membership.id);
  }

  private async mapToRecruiterResponse(
    membership: OrganizationMembership,
  ): Promise<RecruiterResponse> {
    // Get stats
    const [totalJobs, totalApplications, totalHires] = await Promise.all([
      this.jobRepository.count({
        where: {
          organizationId: membership.organizationId,
          userId: membership.userId,
        },
      }),
      this.applicationRepository
        .createQueryBuilder('application')
        .innerJoin('application.job', 'job')
        .where('job.organizationId = :organizationId', {
          organizationId: membership.organizationId,
        })
        .andWhere('application.assignedToUserId = :userId', {
          userId: membership.userId,
        })
        .getCount(),
      this.applicationRepository
        .createQueryBuilder('application')
        .innerJoin('application.job', 'job')
        .where('job.organizationId = :organizationId', {
          organizationId: membership.organizationId,
        })
        .andWhere('application.assignedToUserId = :userId', {
          userId: membership.userId,
        })
        .andWhere('application.status = :status', {
          status: ApplicationStatus.HIRED,
        })
        .getCount(),
    ]);

    const activeOrganizations = await this.membershipRepository.count({
      where: {
        userId: membership.userId,
        status: MembershipStatus.ACTIVE,
      },
    });

    return {
      id: membership.id,
      userId: membership.userId,
      name: membership.user?.fullName || 'Unknown',
      email: membership.user?.email || 'Unknown',
      status: membership.status,
      role: {
        id: membership.role?.id || '',
        name: membership.role?.name || 'Unknown',
        description: membership.role?.description,
      },
      organization: {
        id: membership.organization?.id || '',
        name: membership.organization?.name || 'Unknown',
      },
      joinedAt: membership.joinedAt,
      createdAt: membership.createdAt,
      lastLoginAt: membership.user?.lastLoginAt,
      stats: {
        totalJobs,
        totalApplications,
        totalHires,
        activeOrganizations,
      },
    };
  }
}
