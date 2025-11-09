import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { User } from 'src/modules/identity/domain/entities';
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
import { Interview } from 'src/modules/applications/domain/entities/interview.entity';
import { Offer } from 'src/modules/applications/domain/entities/offer.entity';
import { CandidateProfile } from 'src/modules/profile/domain/entities/candidate-profile.entity';
import {
  BackofficeStatsQueryDto,
  StatsPeriod,
  BackofficeStatsResponse,
} from '../dtos/backoffice-stats.dto';

@Injectable()
export class BackofficeStatsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationMembership)
    private readonly membershipRepository: Repository<OrganizationMembership>,
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(Interview)
    private readonly interviewRepository: Repository<Interview>,
    @InjectRepository(Offer)
    private readonly offerRepository: Repository<Offer>,
    @InjectRepository(CandidateProfile)
    private readonly candidateProfileRepository: Repository<CandidateProfile>,
  ) {}

  async getBackofficeStats(
    query: BackofficeStatsQueryDto,
  ): Promise<BackofficeStatsResponse> {
    const { startDate, endDate } = this.calculateDateRange(query);
    const [
      totalUsers,
      totalOrganizations,
      totalJobs,
      totalApplications,
      totalRecruiters,
      totalCandidates,
      activeJobs,
      activeRecruiters,
    ] = await Promise.all([
      this.userRepository.count(),
      this.organizationRepository.count(),
      this.jobRepository.count(),
      this.applicationRepository.count(),
      this.getRecruitersCount(),
      this.candidateProfileRepository.count(),
      this.jobRepository.count({ where: { status: JobStatus.ACTIVE } }),
      this.getActiveRecruitersCount(),
    ]);

    const growth = await this.getGrowthMetrics(startDate, endDate);

    const activity = await this.getActivityMetrics(startDate, endDate);

    const topPerformers = await this.getTopPerformers(startDate, endDate);

    const trends = await this.getTrends(startDate, endDate, query.period);

    return {
      overview: {
        totalUsers,
        totalOrganizations,
        totalJobs,
        totalApplications,
        totalRecruiters,
        totalCandidates,
        activeJobs,
        activeRecruiters,
      },
      growth,
      activity,
      topPerformers,
      trends,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };
  }

  private calculateDateRange(query: BackofficeStatsQueryDto): {
    startDate: Date;
    endDate: Date;
  } {
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    let startDate: Date;

    if (query.startDate) {
      startDate = new Date(query.startDate);
    } else {
      const period = query.period || StatsPeriod.MONTH;
      startDate = this.getStartDateForPeriod(endDate, period);
    }

    return { startDate, endDate };
  }

  private getStartDateForPeriod(endDate: Date, period: StatsPeriod): Date {
    const startDate = new Date(endDate);
    switch (period) {
      case StatsPeriod.TODAY:
        startDate.setHours(0, 0, 0, 0);
        break;
      case StatsPeriod.WEEK:
        startDate.setDate(startDate.getDate() - 7);
        break;
      case StatsPeriod.MONTH:
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case StatsPeriod.QUARTER:
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case StatsPeriod.YEAR:
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case StatsPeriod.ALL_TIME:
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1);
    }
    return startDate;
  }

  private async getRecruitersCount(): Promise<number> {
    return this.membershipRepository
      .createQueryBuilder('membership')
      .innerJoin('membership.role', 'role')
      .where('membership.status = :status', { status: MembershipStatus.ACTIVE })
      .andWhere('role.name IN (:...roles)', {
        roles: ['recruiter', 'hr_manager', 'admin', 'owner'],
      })
      .getCount();
  }

  private async getActiveRecruitersCount(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.membershipRepository
      .createQueryBuilder('membership')
      .innerJoin('membership.role', 'role')
      .innerJoin('membership.user', 'user')
      .where('membership.status = :status', { status: MembershipStatus.ACTIVE })
      .andWhere('role.name IN (:...roles)', {
        roles: ['recruiter', 'hr_manager', 'admin', 'owner'],
      })
      .andWhere('user.lastLoginAt >= :lastLogin', { lastLogin: thirtyDaysAgo })
      .getCount();
  }

  private async getGrowthMetrics(startDate: Date, endDate: Date) {
    const previousStartDate = new Date(startDate);
    const previousEndDate = new Date(startDate);
    const duration = endDate.getTime() - startDate.getTime();
    previousStartDate.setTime(previousStartDate.getTime() - duration);
    previousEndDate.setTime(previousEndDate.getTime() - duration);

    const [newUsers, newOrganizations, newJobs, newApplications] =
      await Promise.all([
        this.userRepository.count({
          where: {
            createdAt: Between(startDate, endDate),
          },
        }),
        this.organizationRepository.count({
          where: {
            createdAt: Between(startDate, endDate),
          },
        }),
        this.jobRepository.count({
          where: {
            createdAt: Between(startDate, endDate),
          },
        }),
        this.applicationRepository.count({
          where: {
            appliedDate: Between(startDate, endDate),
          },
        }),
      ]);

    const [prevUsers, prevOrganizations, prevJobs] = await Promise.all([
      this.userRepository.count({
        where: {
          createdAt: Between(previousStartDate, previousEndDate),
        },
      }),
      this.organizationRepository.count({
        where: {
          createdAt: Between(previousStartDate, previousEndDate),
        },
      }),
      this.jobRepository.count({
        where: {
          createdAt: Between(previousStartDate, previousEndDate),
        },
      }),
    ]);

    return {
      newUsers,
      newOrganizations,
      newJobs,
      newApplications,
      growthRate: {
        users: prevUsers > 0 ? ((newUsers - prevUsers) / prevUsers) * 100 : 0,
        organizations:
          prevOrganizations > 0
            ? ((newOrganizations - prevOrganizations) / prevOrganizations) * 100
            : 0,
        jobs: prevJobs > 0 ? ((newJobs - prevJobs) / prevJobs) * 100 : 0,
      },
    };
  }

  private async getActivityMetrics(startDate: Date, endDate: Date) {
    const [
      jobsPosted,
      applicationsReceived,
      interviewsScheduled,
      offersSent,
      hires,
    ] = await Promise.all([
      this.jobRepository.count({
        where: {
          createdAt: Between(startDate, endDate),
        },
      }),
      this.applicationRepository.count({
        where: {
          appliedDate: Between(startDate, endDate),
        },
      }),
      this.interviewRepository.count({
        where: {
          scheduledDate: Between(startDate, endDate),
        },
      }),
      this.offerRepository.count({
        where: {
          createdAt: Between(startDate, endDate),
        },
      }),
      this.applicationRepository.count({
        where: {
          status: ApplicationStatus.HIRED,
          lastStatusChange: Between(startDate, endDate),
        },
      }),
    ]);

    return {
      jobsPosted,
      applicationsReceived,
      interviewsScheduled,
      offersSent,
      hires,
    };
  }

  private async getTopPerformers(startDate: Date, endDate: Date) {
    // Top organizations by jobs and hires
    const topOrgs: {
      id: string;
      name: string;
      jobsPosted: string;
      hires: string;
    }[] = await this.organizationRepository
      .createQueryBuilder('org')
      .leftJoin(Job, 'job', 'job.organizationId = org.id')
      .leftJoin(Application, 'application', 'application.jobId = job.id')
      .select('org.id', 'id')
      .addSelect('org.name', 'name')
      .addSelect('COUNT(DISTINCT job.id)', 'jobsPosted')
      .addSelect(
        `COUNT(DISTINCT CASE WHEN application.status = :hired THEN application.id ELSE NULL END)`,
        'hires',
      )
      .where('job.createdAt >= :startDate', { startDate })
      .andWhere('job.createdAt <= :endDate', { endDate })
      .setParameter('hired', ApplicationStatus.HIRED)
      .groupBy('org.id')
      .addGroupBy('org.name')
      .orderBy(
        'COUNT(DISTINCT CASE WHEN application.status = :hired THEN application.id ELSE NULL END)',
        'DESC',
      ) // FIX: Use full expression
      .addOrderBy('COUNT(DISTINCT job.id)', 'DESC') // FIX: Use full expression
      .limit(10)
      .getRawMany();

    const topRecruiters: {
      id: string;
      name: string;
      email: string;
      organizations: string;
      hires: string;
    }[] = await this.membershipRepository
      .createQueryBuilder('membership')
      .innerJoin('membership.user', 'user')
      .innerJoin('membership.role', 'role')
      .innerJoin('membership.organization', 'org')
      .leftJoin(Job, 'job', 'job.organizationId = org.id')
      .leftJoin(Application, 'application', 'application.jobId = job.id')
      .select('"user"."id"', 'id')
      .addSelect('"user"."fullName"', 'name')
      .addSelect('"user"."email"', 'email')
      .addSelect('COUNT(DISTINCT "org"."id")', 'organizations')
      .addSelect(
        `COUNT(DISTINCT CASE WHEN application.status = :hired THEN application.id ELSE NULL END)`,
        'hires',
      )
      .where('membership.status = :status', { status: MembershipStatus.ACTIVE })
      .andWhere('role.name IN (:...roles)', {
        roles: ['recruiter', 'hr_manager', 'admin', 'owner'],
      })
      .andWhere('job.createdAt >= :startDate', { startDate })
      .andWhere('job.createdAt <= :endDate', { endDate })
      .setParameter('hired', ApplicationStatus.HIRED)
      .groupBy('"user"."id"')
      .addGroupBy('"user"."fullName"')
      .addGroupBy('"user"."email"')
      .orderBy(
        'COUNT(DISTINCT CASE WHEN application.status = :hired THEN application.id ELSE NULL END)',
        'DESC',
      )
      .limit(10)
      .getRawMany();

    return {
      topOrganizations: topOrgs.map((org) => ({
        id: org.id,
        name: org.name,
        jobsPosted: parseInt(org.jobsPosted) || 0,
        hires: parseInt(org.hires) || 0,
      })),
      topRecruiters: topRecruiters.map((rec) => ({
        id: rec.id,
        name: rec.name,
        email: rec.email,
        organizations: parseInt(rec.organizations) || 0,
        hires: parseInt(rec.hires) || 0,
      })),
    };
  }

  private async getTrends(
    startDate: Date,
    endDate: Date,
    period?: StatsPeriod,
  ) {
    const groupBy = period === StatsPeriod.WEEK ? 'week' : 'month';

    const usersByPeriod = await this.getCountsByPeriod(
      this.userRepository,
      'createdAt',
      startDate,
      endDate,
      groupBy,
    );

    const jobsByPeriod = await this.getCountsByPeriod(
      this.jobRepository,
      'createdAt',
      startDate,
      endDate,
      groupBy,
    );

    const applicationsByPeriod = await this.getCountsByPeriod(
      this.applicationRepository,
      'appliedDate',
      startDate,
      endDate,
      groupBy,
    );

    return {
      usersByPeriod,
      jobsByPeriod,
      applicationsByPeriod,
    };
  }

  private async getCountsByPeriod(
    repository: Repository<any>,
    dateField: string,
    startDate: Date,
    endDate: Date,
    groupBy: 'week' | 'month',
  ) {
    const query = repository
      .createQueryBuilder('entity')
      .select(
        groupBy === 'week'
          ? `DATE_TRUNC('week', entity.${dateField})`
          : `DATE_TRUNC('month', entity.${dateField})`,
        'period',
      )
      .addSelect('COUNT(*)', 'count')
      .where(`entity.${dateField} >= :startDate`, { startDate })
      .andWhere(`entity.${dateField} <= :endDate`, { endDate })
      .groupBy('period')
      .orderBy('period', 'ASC');

    const results = await query.getRawMany();

    return results.map((r) => ({
      period: r.period.toISOString().split('T')[0],
      count: parseInt(r.count) || 0,
    }));
  }
}
