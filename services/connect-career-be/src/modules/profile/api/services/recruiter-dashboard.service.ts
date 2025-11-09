import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../../domain/entities/organization.entity';
import {
  OrganizationMembership,
  MembershipStatus,
} from '../../domain/entities/organization-memberships.entity';
import {
  Application,
  ApplicationStatus,
} from 'src/modules/applications/domain/entities/application.entity';
import { Job, JobStatus } from 'src/modules/jobs/domain/entities/job.entity';
import {
  Interview,
  InterviewStatus,
} from 'src/modules/applications/domain/entities/interview.entity';
import {
  Offer,
  OfferStatus,
} from 'src/modules/applications/domain/entities/offer.entity';
import { User } from 'src/modules/identity/domain/entities';
import {
  RecruiterDashboardQueryDto,
  DashboardPeriod,
} from '../dtos/recruiter-dashboard.dto';
import {
  CompanyOverview,
  MyWorkSummary,
  QuickActions,
  RecruiterDashboardResponse,
  RecruiterPerformance,
  UpcomingTasks,
} from '../dtos/recruiter-dashboard.response.dto';
@Injectable()
export class RecruiterDashboardService {
  private readonly logger = new Logger(RecruiterDashboardService.name);
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationMembership)
    private readonly membershipRepository: Repository<OrganizationMembership>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(Interview)
    private readonly interviewRepository: Repository<Interview>,
    @InjectRepository(Offer)
    private readonly offerRepository: Repository<Offer>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getRecruiterDashboard(
    userId: string,
    query: RecruiterDashboardQueryDto,
  ): Promise<RecruiterDashboardResponse> {
    try {
      this.logger.log(`Getting dashboard for user ${userId}`);

      // Get user's organization memberships
      const memberships = await this.membershipRepository.find({
        where: {
          userId,
          status: MembershipStatus.ACTIVE,
        },
        relations: ['organization', 'role'], // Ensure role is loaded
      });

      if (memberships.length === 0) {
        throw new NotFoundException('No active organization memberships found');
      }

      // If organizationId is specified, filter to that organization
      const targetMembership = query.organizationId
        ? memberships.find((m) => m.organizationId === query.organizationId)
        : memberships[0]; // Default to first organization

      if (!targetMembership) {
        throw new NotFoundException('Organization not found or access denied');
      }

      // FIX: Check if role exists
      if (!targetMembership.role) {
        this.logger.error(`Membership ${targetMembership.id} has no role`);
        throw new NotFoundException('Organization role not found');
      }

      const organizationId = targetMembership.organizationId;
      const organization = targetMembership.organization;

      if (!organization) {
        this.logger.error(
          `Membership ${targetMembership.id} has no organization`,
        );
        throw new NotFoundException('Organization not found');
      }

      // Calculate date range
      const { startDate, endDate } = this.calculateDateRange(query);

      // Fetch all data in parallel
      const [
        myWork,
        companyOverview,
        upcomingTasks,
        quickActions,
        performance,
      ] = await Promise.all([
        this.getMyWorkSummary(userId, organizationId, query),
        this.getCompanyOverview(organizationId, organization),
        this.getUpcomingTasks(userId, organizationId),
        this.getQuickActions(
          userId,
          organizationId,
          targetMembership.role.name,
        ),
        this.getRecruiterPerformance(
          userId,
          organizationId,
          startDate,
          endDate,
          query,
        ),
      ]);

      return {
        myWork,
        companyOverview,
        upcomingTasks,
        quickActions,
        performance,
        notifications: {
          unreadCount: 0,
          recent: [],
        },
      };
    } catch (error) {
      this.logger.error(
        `Error getting recruiter dashboard for user ${userId}:`,
        error.stack,
      );
      throw error; // Re-throw to let NestJS handle it
    }
  }

  private calculateDateRange(query: RecruiterDashboardQueryDto): {
    startDate: Date;
    endDate: Date;
  } {
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    let startDate: Date;

    if (query.startDate) {
      startDate = new Date(query.startDate);
    } else {
      const period = query.period || DashboardPeriod.MONTH;
      startDate = this.getStartDateForPeriod(endDate, period);
    }

    return { startDate, endDate };
  }

  private getStartDateForPeriod(endDate: Date, period: DashboardPeriod): Date {
    const startDate = new Date(endDate);
    switch (period) {
      case DashboardPeriod.TODAY:
        startDate.setHours(0, 0, 0, 0);
        break;
      case DashboardPeriod.WEEK:
        startDate.setDate(startDate.getDate() - 7);
        break;
      case DashboardPeriod.MONTH:
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case DashboardPeriod.QUARTER:
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1);
    }
    return startDate;
  }

  private async getMyWorkSummary(
    userId: string,
    organizationId: string,
    query: RecruiterDashboardQueryDto,
  ): Promise<MyWorkSummary> {
    // Get applications assigned to this recruiter
    const assignedApplicationsQuery = this.applicationRepository
      .createQueryBuilder('application')
      .innerJoin('application.job', 'job')
      .where('job.organizationId = :organizationId', { organizationId })
      .andWhere('application.assignedToUserId = :userId', { userId });

    if (query.assignedOnly !== false) {
      // Only show assigned applications by default
    }

    const assignedApplications = await assignedApplicationsQuery.getMany();

    // Group by status
    const byStatus = assignedApplications.reduce(
      (acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const byStatusArray = Object.entries(byStatus).map(([status, count]) => ({
      status,
      count,
    }));

    // Count urgent applications (flagged or high priority)
    const urgent = assignedApplications.filter(
      (app) => app.isFlagged || app.priority >= 3,
    ).length;

    // Count applications needing attention
    const needsAttention = assignedApplications.filter((app) => {
      // Awaiting candidate response
      if (app.awaitingCandidateResponse) return true;

      // Overdue reminders
      if (app.reminders) {
        const now = new Date();
        const overdueReminders = app.reminders.filter(
          (r) => !r.completed && new Date(r.dueDate) < now,
        );
        if (overdueReminders.length > 0) return true;
      }

      // No contact for more than 7 days
      if (app.lastContactDate) {
        const daysSinceContact = Math.floor(
          (new Date().getTime() - new Date(app.lastContactDate).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        if (daysSinceContact > 7) return true;
      }

      return false;
    }).length;

    // Get interviews
    const myInterviews = await this.interviewRepository
      .createQueryBuilder('interview')
      .innerJoin('interview.application', 'application')
      .innerJoin('application.job', 'job')
      .where('job.organizationId = :organizationId', { organizationId })
      .andWhere('interview.interviewerId = :userId', { userId })
      .getMany();

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const interviewsToday = myInterviews.filter((i) => {
      const interviewDate = new Date(i.scheduledDate);
      return (
        interviewDate >= todayStart &&
        interviewDate < new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
      );
    }).length;

    const interviewsThisWeek = myInterviews.filter((i) => {
      const interviewDate = new Date(i.scheduledDate);
      return interviewDate >= weekStart && interviewDate < now;
    }).length;

    const upcomingInterviews = myInterviews.filter((i) => {
      const interviewDate = new Date(i.scheduledDate);
      return (
        interviewDate >= now &&
        [InterviewStatus.SCHEDULED, InterviewStatus.RESCHEDULED].includes(
          i.status,
        )
      );
    }).length;

    const completedInterviews = myInterviews.filter(
      (i) => i.status === InterviewStatus.COMPLETED,
    ).length;

    // Get offers
    const myOffers = await this.offerRepository
      .createQueryBuilder('offer')
      .innerJoin('offer.application', 'application')
      .innerJoin('application.job', 'job')
      .where('job.organizationId = :organizationId', { organizationId })
      .andWhere('offer.offeredBy = :userId', { userId })
      .getMany();

    const pendingOffers = myOffers.filter(
      (o) => o.status === OfferStatus.PENDING,
    ).length;
    const awaitingResponseOffers = myOffers.filter(
      (o) =>
        o.status === OfferStatus.PENDING ||
        o.status === OfferStatus.NEGOTIATING,
    ).length;
    const acceptedOffers = myOffers.filter(
      (o) => o.status === OfferStatus.ACCEPTED,
    ).length;
    const rejectedOffers = myOffers.filter(
      (o) => o.status === OfferStatus.REJECTED,
    ).length;

    // Get tasks (reminders)
    const allReminders = assignedApplications
      .flatMap((app) =>
        (app.reminders || []).map((r) => ({ ...r, applicationId: app.id })),
      )
      .filter((r) => !r.completed);

    const nowDate = new Date();
    const overdueTasks = allReminders.filter(
      (r) => new Date(r.dueDate) < nowDate,
    ).length;
    const dueTodayTasks = allReminders.filter((r) => {
      const dueDate = new Date(r.dueDate);
      return (
        dueDate >= todayStart &&
        dueDate < new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
      );
    }).length;

    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dueThisWeekTasks = allReminders.filter((r) => {
      const dueDate = new Date(r.dueDate);
      return dueDate >= weekStart && dueDate < weekEnd;
    }).length;

    return {
      assignedApplications: {
        total: assignedApplications.length,
        byStatus: byStatusArray,
        urgent,
        needsAttention,
      },
      myInterviews: {
        today: interviewsToday,
        thisWeek: interviewsThisWeek,
        upcoming: upcomingInterviews,
        completed: completedInterviews,
      },
      myOffers: {
        pending: pendingOffers,
        awaitingResponse: awaitingResponseOffers,
        accepted: acceptedOffers,
        rejected: rejectedOffers,
      },
      tasks: {
        total: allReminders.length,
        overdue: overdueTasks,
        dueToday: dueTodayTasks,
        dueThisWeek: dueThisWeekTasks,
      },
    };
  }

  private async getCompanyOverview(
    organizationId: string,
    organization: Organization,
  ): Promise<CompanyOverview> {
    try {
      const jobs = await this.jobRepository.find({
        where: { organizationId },
      });

      const activeJobs = jobs.filter(
        (j) => j.status === JobStatus.ACTIVE,
      ).length;
      const pausedJobs = jobs.filter(
        (j) => j.status === JobStatus.PAUSED,
      ).length;
      const closedJobs = jobs.filter(
        (j) => j.status === JobStatus.CLOSED,
      ).length;
      const totalApplications = jobs.reduce(
        (sum, job) => sum + (job.applications || 0),
        0,
      );

      // New applications today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const newApplicationsToday = await this.applicationRepository
        .createQueryBuilder('application')
        .innerJoin('application.job', 'job')
        .where('job.organizationId = :organizationId', { organizationId })
        .andWhere('application.appliedDate >= :todayStart', { todayStart })
        .getCount();

      // Get all applications
      const applications = await this.applicationRepository
        .createQueryBuilder('application')
        .innerJoin('application.job', 'job')
        .where('job.organizationId = :organizationId', { organizationId })
        .getMany();

      const byStatus = applications.reduce(
        (acc, app) => {
          acc[app.status] = (acc[app.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const byStatusArray = Object.entries(byStatus).map(([status, count]) => ({
        status,
        count,
      }));

      // New applications this week
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 7);
      const newApplicationsThisWeek = applications.filter(
        (app) => new Date(app.appliedDate) >= weekStart,
      ).length;

      // Pipeline stages
      const pipelineStages = new Map<string, number>();
      applications.forEach((app) => {
        const stageKey = app.currentStageKey || app.status;
        pipelineStages.set(stageKey, (pipelineStages.get(stageKey) || 0) + 1);
      });

      const byStage = Array.from(pipelineStages.entries()).map(
        ([stageKey, count]) => ({
          stageName:
            applications.find(
              (a) => (a.currentStageKey || a.status) === stageKey,
            )?.currentStageName || stageKey,
          stageKey,
          count,
        }),
      );

      // Recent activity (last 20 activities)
      const recentApplications = await this.applicationRepository
        .createQueryBuilder('application')
        .innerJoin('application.job', 'job')
        .leftJoinAndSelect('application.candidate', 'candidate')
        .where('job.organizationId = :organizationId', { organizationId })
        .orderBy('application.appliedDate', 'DESC')
        .take(20)
        .getMany();

      const recentActivity = recentApplications.slice(0, 10).map((app) => ({
        type: 'application',
        description: `New application from ${app.candidate.fullName || 'Candidate'}`,
        timestamp: app.appliedDate,
        relatedId: app.id,
      }));

      return {
        organization: {
          id: organization.id,
          name: organization.name || '',
          logo: organization.logoFile?.secureUrl,
        },
        jobs: {
          total: jobs.length,
          active: activeJobs,
          paused: pausedJobs,
          closed: closedJobs,
          totalApplications,
          newApplicationsToday,
        },
        applications: {
          total: applications.length,
          byStatus: byStatusArray,
          newToday: newApplicationsToday,
          newThisWeek: newApplicationsThisWeek,
        },
        pipeline: {
          totalCandidates: applications.length,
          byStage,
        },
        recentActivity,
      };
    } catch (error) {
      this.logger.error(
        `Error getting company overview for organization ${organizationId}:`,
        error.stack,
      );
      throw error;
    }
  }

  private async getUpcomingTasks(
    userId: string,
    organizationId: string,
  ): Promise<UpcomingTasks> {
    try {
      const now = new Date();
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Get upcoming interviews
      const upcomingInterviews = await this.interviewRepository
        .createQueryBuilder('interview')
        .innerJoinAndSelect('interview.application', 'application')
        .innerJoinAndSelect('application.job', 'job')
        .leftJoinAndSelect('application.candidate', 'candidate')
        .where('job.organizationId = :organizationId', { organizationId })
        .andWhere('interview.interviewerId = :userId', { userId })
        .andWhere('interview.scheduledDate >= :now', { now })
        .andWhere('interview.status IN (:...statuses)', {
          statuses: [InterviewStatus.SCHEDULED, InterviewStatus.RESCHEDULED],
        })
        .orderBy('interview.scheduledDate', 'ASC')
        .take(20)
        .getMany();

      const interviews = upcomingInterviews.map((interview) => {
        const interviewDate = new Date(interview.scheduledDate);
        const isToday =
          interviewDate >= todayStart &&
          interviewDate < new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
        const isUpcoming = interviewDate >= now && interviewDate <= weekEnd;

        return {
          id: interview.id,
          applicationId: interview.applicationId,
          candidateName:
            interview.application?.candidate?.fullName || 'Unknown',
          jobTitle: interview.application.job.title,
          scheduledDate: interview.scheduledDate,
          type: interview.type,
          status: interview.status,
          meetingLink: interview.meetingLink,
          location: interview.location,
          isToday,
          isUpcoming,
        };
      });

      // Get reminders
      const assignedApplications = await this.applicationRepository
        .createQueryBuilder('application')
        .innerJoin('application.job', 'job')
        .leftJoinAndSelect('application.candidate', 'candidate')
        .where('job.organizationId = :organizationId', { organizationId })
        .andWhere('application.assignedToUserId = :userId', { userId })
        .getMany();

      const allReminders = assignedApplications
        .flatMap((app) =>
          (app.reminders || [])
            .filter((r) => !r.completed)
            .map((r) => ({
              ...r,
              applicationId: app.id,
              candidateName: app.candidate?.fullName || 'Unknown',
              jobTitle: app.job?.title || 'Unknown',
            })),
        )
        .sort(
          (a, b) =>
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
        )
        .slice(0, 20);

      const reminders = allReminders.map((reminder) => ({
        id: reminder.id,
        applicationId: reminder.applicationId,
        candidateName: reminder.candidateName,
        jobTitle: reminder.jobTitle,
        type: reminder.type,
        dueDate: new Date(reminder.dueDate),
        notes: reminder.notes,
        isOverdue: new Date(reminder.dueDate) < now,
      }));

      // Get follow-ups needed
      const followUps = assignedApplications
        .filter((app) => {
          if (!app.lastContactDate) return true;
          const daysSince = Math.floor(
            (now.getTime() - new Date(app.lastContactDate).getTime()) /
              (1000 * 60 * 60 * 24),
          );
          return (
            daysSince >= 7 &&
            ![
              ApplicationStatus.HIRED,
              ApplicationStatus.REJECTED,
              ApplicationStatus.WITHDRAWN,
            ].includes(app.status)
          );
        })
        .map((app) => ({
          applicationId: app.id,
          candidateName: app.candidate?.fullName || 'Unknown',
          jobTitle: app.job?.title || 'Unknown',
          lastContactDate: app.lastContactDate,
          daysSinceLastContact: app.lastContactDate
            ? Math.floor(
                (now.getTime() - new Date(app.lastContactDate).getTime()) /
                  (1000 * 60 * 60 * 24),
              )
            : 999,
          status: app.status,
          needsFollowUp: true,
        }))
        .sort((a, b) => b.daysSinceLastContact - a.daysSinceLastContact)
        .slice(0, 10);

      // Get pending actions
      const pendingActions = assignedApplications
        .filter((app) => {
          // Applications that need review (new or under review)
          if (
            [ApplicationStatus.NEW, ApplicationStatus.UNDER_REVIEW].includes(
              app.status,
            )
          ) {
            return true;
          }
          // Applications ready for interview scheduling
          if (
            app.status === ApplicationStatus.SHORTLISTED &&
            !app.nextInterviewDate
          ) {
            return true;
          }
          // Applications ready for offer
          if (
            app.status === ApplicationStatus.INTERVIEW_COMPLETED &&
            !app.currentOfferId
          ) {
            return true;
          }
          return false;
        })
        .map((app) => {
          let actionType = 'review';
          if (app.status === ApplicationStatus.SHORTLISTED)
            actionType = 'schedule_interview';
          if (app.status === ApplicationStatus.INTERVIEW_COMPLETED)
            actionType = 'send_offer';

          return {
            type: actionType,
            applicationId: app.id,
            candidateName: app.candidate?.fullName || 'Unknown',
            jobTitle: app.job?.title || 'Unknown',
            priority: app.priority || 0,
            dueDate: app.reminders?.find((r) => !r.completed)?.dueDate,
          };
        })
        .sort((a, b) => (b.priority || 0) - (a.priority || 0))
        .slice(0, 10);

      return {
        interviews,
        reminders,
        followUps,
        pendingActions,
      };
    } catch (error) {
      this.logger.error(
        `Error getting upcoming tasks for user ${userId}:`,
        error.stack,
      );
      throw error;
    }
  }

  private async getQuickActions(
    userId: string,
    organizationId: string,
    roleName: string,
  ): Promise<QuickActions> {
    // Check permissions based on role
    const canCreateJob = ['owner', 'admin', 'hr_manager', 'recruiter'].includes(
      roleName,
    );
    const canInviteCandidate = [
      'owner',
      'admin',
      'hr_manager',
      'recruiter',
    ].includes(roleName);
    const canScheduleInterview = [
      'owner',
      'admin',
      'hr_manager',
      'recruiter',
    ].includes(roleName);
    const canSendOffer = ['owner', 'admin', 'hr_manager'].includes(roleName);

    // Get quick stats
    const assignedApplications = await this.applicationRepository
      .createQueryBuilder('application')
      .innerJoin('application.job', 'job')
      .where('job.organizationId = :organizationId', { organizationId })
      .andWhere('application.assignedToUserId = :userId', { userId })
      .getMany();

    const applicationsToReview = assignedApplications.filter((app) =>
      [ApplicationStatus.NEW, ApplicationStatus.UNDER_REVIEW].includes(
        app.status,
      ),
    ).length;

    const interviewsToSchedule = assignedApplications.filter(
      (app) =>
        app.status === ApplicationStatus.SHORTLISTED && !app.nextInterviewDate,
    ).length;

    const offersToSend = assignedApplications.filter(
      (app) =>
        app.status === ApplicationStatus.INTERVIEW_COMPLETED &&
        !app.currentOfferId,
    ).length;

    const candidatesToContact = assignedApplications.filter((app) => {
      if (!app.lastContactDate) return true;
      const daysSince = Math.floor(
        (new Date().getTime() - new Date(app.lastContactDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      return daysSince >= 7;
    }).length;

    return {
      canCreateJob,
      canInviteCandidate,
      canScheduleInterview,
      canSendOffer,
      quickStats: {
        applicationsToReview,
        interviewsToSchedule,
        offersToSend,
        candidatesToContact,
      },
    };
  }

  private async getRecruiterPerformance(
    userId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date,
    query: RecruiterDashboardQueryDto,
  ): Promise<RecruiterPerformance> {
    // Get applications assigned to this recruiter in the period
    const applications = await this.applicationRepository
      .createQueryBuilder('application')
      .innerJoin('application.job', 'job')
      .where('job.organizationId = :organizationId', { organizationId })
      .andWhere('application.assignedToUserId = :userId', { userId })
      .andWhere('application.appliedDate >= :startDate', { startDate })
      .andWhere('application.appliedDate <= :endDate', { endDate })
      .getMany();

    const applicationsReviewed = applications.filter(
      (app) =>
        app.reviewedBy === userId && app.status !== ApplicationStatus.NEW,
    ).length;

    // Get interviews conducted
    const interviews = await this.interviewRepository
      .createQueryBuilder('interview')
      .innerJoin('interview.application', 'application')
      .innerJoin('application.job', 'job')
      .where('job.organizationId = :organizationId', { organizationId })
      .andWhere('interview.interviewerId = :userId', { userId })
      .andWhere('interview.scheduledDate >= :startDate', { startDate })
      .andWhere('interview.scheduledDate <= :endDate', { endDate })
      .getMany();

    const interviewsConducted = interviews.filter(
      (i) => i.status === InterviewStatus.COMPLETED,
    ).length;

    // Get offers sent
    const offers = await this.offerRepository
      .createQueryBuilder('offer')
      .innerJoin('offer.application', 'application')
      .innerJoin('application.job', 'job')
      .where('job.organizationId = :organizationId', { organizationId })
      .andWhere('offer.offeredBy = :userId', { userId })
      .andWhere('offer.createdAt >= :startDate', { startDate })
      .andWhere('offer.createdAt <= :endDate', { endDate })
      .getMany();

    const offersSent = offers.length;
    const acceptedOffers = offers.filter(
      (o) => o.status === OfferStatus.ACCEPTED,
    ).length;
    const offerAcceptanceRate =
      offersSent > 0 ? (acceptedOffers / offersSent) * 100 : 0;

    // Get hires
    const hires = applications.filter(
      (app) => app.status === ApplicationStatus.HIRED,
    ).length;

    // Calculate average times
    const reviewedApplications = applications.filter(
      (app) => app.reviewedBy === userId && app.reviewedAt,
    );
    const averageTimeToReview =
      reviewedApplications.length > 0
        ? reviewedApplications.reduce((sum, app) => {
            const appliedDate = new Date(app.appliedDate);
            const reviewedDate = app.reviewedAt
              ? new Date(app.reviewedAt)
              : new Date();
            const hours =
              (reviewedDate.getTime() - appliedDate.getTime()) /
              (1000 * 60 * 60);
            return sum + hours;
          }, 0) / reviewedApplications.length
        : 0;

    const scheduledInterviews = interviews.filter(
      (i) =>
        i.status === InterviewStatus.SCHEDULED ||
        i.status === InterviewStatus.COMPLETED,
    );
    const averageTimeToSchedule =
      scheduledInterviews.length > 0
        ? scheduledInterviews.reduce((sum, interview) => {
            // Time from application to interview scheduling
            const application = applications.find(
              (a) => a.id === interview.applicationId,
            );
            if (!application) return sum;
            const appliedDate = new Date(application.appliedDate);
            const scheduledDate = new Date(interview.scheduledDate);
            const hours =
              (scheduledDate.getTime() - appliedDate.getTime()) /
              (1000 * 60 * 60);
            return sum + hours;
          }, 0) / scheduledInterviews.length
        : 0;

    // Response rate (candidate responses to communications)
    const applicationsWithContact = applications.filter(
      (app) => app.lastCandidateResponseDate,
    );
    const responseRate =
      applications.length > 0
        ? (applicationsWithContact.length / applications.length) * 100
        : 0;

    const metrics = {
      applicationsReviewed,
      interviewsConducted,
      offersSent,
      hires,
      averageTimeToReview: Math.round(averageTimeToReview * 10) / 10,
      averageTimeToSchedule: Math.round(averageTimeToSchedule * 10) / 10,
      responseRate: Math.round(responseRate * 10) / 10,
      offerAcceptanceRate: Math.round(offerAcceptanceRate * 10) / 10,
    };

    let comparison: RecruiterPerformance['comparison'] = null;
    if (query.period) {
      const previousStartDate = new Date(startDate);
      const previousEndDate = new Date(startDate);
      const duration = endDate.getTime() - startDate.getTime();
      previousStartDate.setTime(previousStartDate.getTime() - duration);
      previousEndDate.setTime(previousEndDate.getTime() - duration);

      const previousMetrics = await this.getRecruiterPerformance(
        userId,
        organizationId,
        previousStartDate,
        previousEndDate,
        { ...query, period: undefined },
      );

      comparison = {
        previousPeriod: previousMetrics.metrics,
        changes: {
          applicationsReviewed: {
            change:
              metrics.applicationsReviewed -
              previousMetrics.metrics.applicationsReviewed,
            percentage:
              previousMetrics.metrics.applicationsReviewed > 0
                ? ((metrics.applicationsReviewed -
                    previousMetrics.metrics.applicationsReviewed) /
                    previousMetrics.metrics.applicationsReviewed) *
                  100
                : 0,
          },
          hires: {
            change: metrics.hires - previousMetrics.metrics.hires,
            percentage:
              previousMetrics.metrics.hires > 0
                ? ((metrics.hires - previousMetrics.metrics.hires) /
                    previousMetrics.metrics.hires) *
                  100
                : 0,
          },
        },
      };
    }

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      metrics,
      comparison: comparison || {
        previousPeriod: {},
        changes: {
          applicationsReviewed: { change: 0, percentage: 0 },
          hires: { change: 0, percentage: 0 },
        },
      },
    };
  }
}
