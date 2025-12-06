// src/modules/profile/api/services/organization-hiring-analytics.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../../domain/entities/organization.entity';
import {
  Application,
  ApplicationStatus,
  ApplicationSource,
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
import {
  BaseQueryConditions,
  ConversionRateMetrics,
  HiringEffectivenessQueryDto,
  HiringEffectivenessSummary,
  HiringMetricsPeriod,
  PipelineMetrics,
  SourceEffectivenessMetrics,
  TimeToHireMetrics,
} from '../dtos/hiring-effectiveness.dto';

@Injectable()
export class OrganizationHiringAnalyticsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(Interview)
    private readonly interviewRepository: Repository<Interview>,
    @InjectRepository(Offer)
    private readonly offerRepository: Repository<Offer>,
  ) {}

  async getHiringEffectiveness(
    organizationId: string,
    query: HiringEffectivenessQueryDto,
  ): Promise<HiringEffectivenessSummary> {
    // Verify organization exists
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Calculate date range
    const { startDate, endDate } = this.calculateDateRange(query);
    const previousPeriod = query.compareWithPrevious
      ? this.calculatePreviousPeriod(startDate, endDate)
      : null;

    // Build base query conditions
    const baseConditions: BaseQueryConditions = {
      organizationId,
      dateRange: { startDate, endDate },
      jobId: query.jobId,
    };

    // Fetch all relevant data
    const [applications, jobs, interviews, offers, hiredApplications] =
      await Promise.all([
        this.getApplications(baseConditions),
        this.getJobs(baseConditions),
        this.getInterviews(baseConditions),
        this.getOffers(baseConditions),
        this.getHiredApplications(baseConditions),
      ]);

    // Calculate metrics
    const overview = this.calculateOverview(
      applications,
      jobs,
      interviews,
      offers,
      hiredApplications,
    );
    const timeMetrics = await this.calculateTimeMetrics(
      applications,
      hiredApplications,
      jobs,
      query,
    );
    const conversionRates = this.calculateConversionRates(
      applications,
      interviews,
      offers,
      hiredApplications,
    );
    const sourceEffectiveness = this.calculateSourceEffectiveness(
      applications,
      hiredApplications,
    );
    const pipelineMetrics = this.calculatePipelineMetrics(applications);
    const qualityMetrics = this.calculateQualityMetrics(
      applications,
      interviews,
      offers,
      hiredApplications,
    );

    const result: HiringEffectivenessSummary = {
      overview,
      timeMetrics,
      conversionRates,
      sourceEffectiveness,
      pipelineMetrics,
      qualityMetrics,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };

    // Add comparison if requested
    if (query.compareWithPrevious && previousPeriod) {
      const previousMetrics = await this.getHiringEffectiveness(
        organizationId,
        {
          ...query,
          startDate: previousPeriod.startDate.toISOString(),
          endDate: previousPeriod.endDate.toISOString(),
          compareWithPrevious: false,
        },
      );

      result.comparison = {
        previousPeriod: previousMetrics,
        changes: this.calculateChanges(result, previousMetrics),
      };
    }

    return result;
  }

  private calculateDateRange(query: HiringEffectivenessQueryDto): {
    startDate: Date;
    endDate: Date;
  } {
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    let startDate: Date;

    if (query.startDate) {
      startDate = new Date(query.startDate);
    } else {
      // Default to last 30 days if no period specified
      const period = query.period || HiringMetricsPeriod.MONTH;
      startDate = this.getStartDateForPeriod(endDate, period);
    }

    return { startDate, endDate };
  }

  private getStartDateForPeriod(
    endDate: Date,
    period: HiringMetricsPeriod,
  ): Date {
    const startDate = new Date(endDate);
    switch (period) {
      case HiringMetricsPeriod.WEEK:
        startDate.setDate(startDate.getDate() - 7);
        break;
      case HiringMetricsPeriod.MONTH:
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case HiringMetricsPeriod.QUARTER:
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case HiringMetricsPeriod.YEAR:
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1);
    }
    return startDate;
  }

  private calculatePreviousPeriod(
    startDate: Date,
    endDate: Date,
  ): { startDate: Date; endDate: Date } {
    const duration = endDate.getTime() - startDate.getTime();
    return {
      startDate: new Date(startDate.getTime() - duration),
      endDate: startDate,
    };
  }

  private async getApplications(conditions: BaseQueryConditions) {
    const queryBuilder = this.applicationRepository
      .createQueryBuilder('application')
      .innerJoin('application.job', 'job')
      .where('job.organizationId = :organizationId', {
        organizationId: conditions.organizationId,
      })
      .andWhere('application.appliedDate >= :startDate', {
        startDate: conditions.dateRange.startDate,
      })
      .andWhere('application.appliedDate <= :endDate', {
        endDate: conditions.dateRange.endDate,
      });

    if (conditions.jobId) {
      queryBuilder.andWhere('application.jobId = :jobId', {
        jobId: conditions.jobId,
      });
    }

    return queryBuilder.getMany();
  }

  private async getJobs(conditions: BaseQueryConditions) {
    const queryBuilder = this.jobRepository
      .createQueryBuilder('job')
      .where('job.organizationId = :organizationId', {
        organizationId: conditions.organizationId,
      })
      .andWhere('job.createdAt >= :startDate', {
        startDate: conditions.dateRange.startDate,
      })
      .andWhere('job.createdAt <= :endDate', {
        endDate: conditions.dateRange.endDate,
      });

    if (conditions.jobId) {
      queryBuilder.andWhere('job.id = :jobId', { jobId: conditions.jobId });
    }

    return queryBuilder.getMany();
  }

  private async getInterviews(conditions: BaseQueryConditions) {
    const queryBuilder = this.interviewRepository
      .createQueryBuilder('interview')
      .innerJoin('interview.application', 'application')
      .innerJoin('application.job', 'job')
      .where('job.organizationId = :organizationId', {
        organizationId: conditions.organizationId,
      })
      .andWhere('interview.scheduledDate >= :startDate', {
        startDate: conditions.dateRange.startDate,
      })
      .andWhere('interview.scheduledDate <= :endDate', {
        endDate: conditions.dateRange.endDate,
      });

    if (conditions.jobId) {
      queryBuilder.andWhere('job.id = :jobId', { jobId: conditions.jobId });
    }

    return queryBuilder.getMany();
  }

  private async getOffers(conditions: BaseQueryConditions) {
    const queryBuilder = this.offerRepository
      .createQueryBuilder('offer')
      .innerJoin('offer.application', 'application')
      .innerJoin('application.job', 'job')
      .where('job.organizationId = :organizationId', {
        organizationId: conditions.organizationId,
      })
      .andWhere('offer.createdAt >= :startDate', {
        startDate: conditions.dateRange.startDate,
      })
      .andWhere('offer.createdAt <= :endDate', {
        endDate: conditions.dateRange.endDate,
      });

    if (conditions.jobId) {
      queryBuilder.andWhere('job.id = :jobId', { jobId: conditions.jobId });
    }

    return queryBuilder.getMany();
  }

  private async getHiredApplications(conditions: BaseQueryConditions) {
    return await this.applicationRepository
      .createQueryBuilder('application')
      .innerJoin('application.job', 'job')
      .where('job.organizationId = :organizationId', {
        organizationId: conditions?.organizationId ?? '',
      })
      .andWhere('application.status = :status', {
        status: ApplicationStatus.HIRED,
      })
      .andWhere('application.appliedDate >= :startDate', {
        startDate: conditions?.dateRange?.startDate ?? '',
      })
      .andWhere('application.appliedDate <= :endDate', {
        endDate: conditions?.dateRange?.endDate ?? '',
      })
      .getMany();
  }

  private calculateOverview(
    applications: Application[],
    jobs: Job[],
    interviews: Interview[],
    offers: Offer[],
    hiredApplications: Application[],
  ) {
    const activeJobs = jobs.filter(
      (job) => job.status === JobStatus.ACTIVE,
    ).length;
    const activeCandidates = applications.filter(
      (app) =>
        ![
          ApplicationStatus.HIRED,
          ApplicationStatus.REJECTED,
          ApplicationStatus.WITHDRAWN,
        ].includes(app.status),
    ).length;

    return {
      totalApplications: applications.length,
      totalInterviews: interviews.length,
      totalOffers: offers.length,
      totalHires: hiredApplications.length,
      activeJobs,
      activeCandidates,
    };
  }

  private async calculateTimeMetrics(
    applications: Application[],
    hiredApplications: Application[],
    jobs: Job[],
    query: HiringEffectivenessQueryDto,
  ): Promise<TimeToHireMetrics> {
    // Calculate time-to-hire for hired applications
    const timeToHireValues = hiredApplications
      .map((app) => {
        const appliedDate = new Date(app.appliedDate);
        const hiredDate = app.lastStatusChange
          ? new Date(app.lastStatusChange)
          : new Date();
        return Math.floor(
          (hiredDate.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24),
        );
      })
      .filter((days) => days >= 0);

    const average =
      timeToHireValues.length > 0
        ? timeToHireValues.reduce((sum, days) => sum + days, 0) /
          timeToHireValues.length
        : 0;

    const sorted = [...timeToHireValues].sort((a, b) => a - b);
    const median =
      sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;

    // Time-to-hire by job
    const byJob = await Promise.all(
      jobs.map((job) => {
        const jobHires = hiredApplications.filter(
          (app) => app.jobId === job.id,
        );
        if (jobHires.length === 0) return null;

        const avgDays =
          jobHires.reduce((sum, app) => {
            const appliedDate = new Date(app.appliedDate);
            const hiredDate = app.lastStatusChange
              ? new Date(app.lastStatusChange)
              : new Date();
            return (
              sum +
              Math.floor(
                (hiredDate.getTime() - appliedDate.getTime()) /
                  (1000 * 60 * 60 * 24),
              )
            );
          }, 0) / jobHires.length;

        return {
          jobId: job.id,
          jobTitle: job.title,
          averageDays: Math.round(avgDays * 10) / 10,
          count: jobHires.length,
        };
      }),
    );

    // Time-to-hire by source
    const sourceMap = new Map<string, { days: number[]; count: number }>();
    hiredApplications.forEach((app) => {
      const source = app.source || ApplicationSource.OTHER;
      const appliedDate = new Date(app.appliedDate);
      const hiredDate = app.lastStatusChange
        ? new Date(app.lastStatusChange)
        : new Date();
      const days = Math.floor(
        (hiredDate.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (!sourceMap.has(source)) {
        sourceMap.set(source, { days: [], count: 0 });
      }
      const entry = sourceMap.get(source)!;
      entry.days.push(days);
      entry.count++;
    });

    const bySource = Array.from(sourceMap.entries()).map(([source, data]) => ({
      source,
      averageDays: data.days.reduce((sum, d) => sum + d, 0) / data.days.length,
      count: data.count,
    }));

    // Trend (grouped by period)
    const trend = this.calculateTrend(hiredApplications, query);

    return {
      average: Math.round(average * 10) / 10,
      median,
      min: sorted.length > 0 ? sorted[0] : 0,
      max: sorted.length > 0 ? sorted[sorted.length - 1] : 0,
      byJob: byJob.filter(Boolean) as TimeToHireMetrics['byJob'],
      bySource,
      trend,
    };
  }

  private calculateTrend(
    hiredApplications: Application[],
    query: HiringEffectivenessQueryDto,
  ) {
    // Group by week/month based on period
    const period = query.period || HiringMetricsPeriod.MONTH;
    const groupBy = period === HiringMetricsPeriod.WEEK ? 'week' : 'month';

    const grouped = new Map<string, number[]>();
    hiredApplications.forEach((app) => {
      const date = new Date(app.lastStatusChange || app.appliedDate);
      const appliedDate = new Date(app.appliedDate);
      const days = Math.floor(
        (date.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      let key: string;
      if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = `${weekStart.getFullYear()}-W${this.getWeekNumber(weekStart)}`;
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(days);
    });

    return Array.from(grouped.entries())
      .map(([period, days]) => ({
        period,
        averageDays: days.reduce((sum, d) => sum + d, 0) / days.length,
        count: days.length,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  private calculateConversionRates(
    applications: Application[],
    interviews: Interview[],
    offers: Offer[],
    hiredApplications: Application[],
  ): ConversionRateMetrics {
    const totalApplications = applications.length;
    const totalInterviews = interviews.filter((i) =>
      [InterviewStatus.COMPLETED, InterviewStatus.SCHEDULED].includes(i.status),
    ).length;
    const totalOffers = offers.filter(
      (o) => o.status !== OfferStatus.REJECTED,
    ).length;
    const totalHires = hiredApplications.length;

    const applicationToInterview =
      totalApplications > 0 ? (totalInterviews / totalApplications) * 100 : 0;

    const interviewToOffer =
      totalInterviews > 0 ? (totalOffers / totalInterviews) * 100 : 0;

    const offerToHire = totalOffers > 0 ? (totalHires / totalOffers) * 100 : 0;

    const overallFunnel =
      totalApplications > 0 ? (totalHires / totalApplications) * 100 : 0;

    const byStage = this.calculateStageConversions(applications);

    const bySource = this.calculateSourceConversions(
      applications,
      interviews,
      offers,
      hiredApplications,
    );

    return {
      applicationToInterview: Math.round(applicationToInterview * 10) / 10,
      interviewToOffer: Math.round(interviewToOffer * 10) / 10,
      offerToHire: Math.round(offerToHire * 10) / 10,
      overallFunnel: Math.round(overallFunnel * 10) / 10,
      byStage,
      bySource,
    };
  }

  private calculateStageConversions(applications: Application[]) {
    const stages = [
      {
        from: ApplicationStatus.NEW,
        to: ApplicationStatus.UNDER_REVIEW,
        name: 'New to Review',
      },
      {
        from: ApplicationStatus.UNDER_REVIEW,
        to: ApplicationStatus.SHORTLISTED,
        name: 'Review to Shortlist',
      },
      {
        from: ApplicationStatus.SHORTLISTED,
        to: ApplicationStatus.INTERVIEW_SCHEDULED,
        name: 'Shortlist to Interview',
      },
    ];

    return stages.map((stage) => {
      const fromCount = applications.filter(
        (app) => app.status === stage.from,
      ).length;
      const toCount = applications.filter((app) =>
        app.statusHistory?.some(
          (h) =>
            h.status === stage.from &&
            app.statusHistory?.find(
              (h2) => h2.status === stage.to && h2.changedAt > h.changedAt,
            ),
        ),
      ).length;

      return {
        stageName: stage.name,
        fromStage: stage.from,
        toStage: stage.to,
        conversionRate: fromCount > 0 ? (toCount / fromCount) * 100 : 0,
        count: toCount,
      };
    });
  }

  private calculateSourceConversions(
    applications: Application[],
    interviews: Interview[],
    offers: Offer[],
    hiredApplications: Application[],
  ) {
    const sourceMap = new Map<
      string,
      {
        applications: number;
        interviews: number;
        offers: number;
        hires: number;
      }
    >();

    applications.forEach((app) => {
      const source = app.source || ApplicationSource.OTHER;
      if (!sourceMap.has(source)) {
        sourceMap.set(source, {
          applications: 0,
          interviews: 0,
          offers: 0,
          hires: 0,
        });
      }
      sourceMap.get(source)!.applications++;
    });

    interviews.forEach((interview) => {
      const app = applications.find((a) => a.id === interview.applicationId);
      if (app) {
        const source = app.source || ApplicationSource.OTHER;
        if (sourceMap.has(source)) {
          sourceMap.get(source)!.interviews++;
        }
      }
    });

    offers.forEach((offer) => {
      const app = applications.find((a) => a.id === offer.applicationId);
      if (app) {
        const source = app.source || ApplicationSource.OTHER;
        if (sourceMap.has(source)) {
          sourceMap.get(source)!.offers++;
        }
      }
    });

    hiredApplications.forEach((app) => {
      const source = app.source || ApplicationSource.OTHER;
      if (sourceMap.has(source)) {
        sourceMap.get(source)!.hires++;
      }
    });

    return Array.from(sourceMap.entries()).map(([source, data]) => ({
      source,
      applicationToInterview:
        data.applications > 0 ? (data.interviews / data.applications) * 100 : 0,
      interviewToOffer:
        data.interviews > 0 ? (data.offers / data.interviews) * 100 : 0,
      offerToHire: data.offers > 0 ? (data.hires / data.offers) * 100 : 0,
    }));
  }

  private calculateSourceEffectiveness(
    applications: Application[],
    hiredApplications: Application[],
  ): SourceEffectivenessMetrics {
    const sourceStats = new Map<
      string,
      {
        applications: Application[];
        hires: Application[];
        matchingScores: number[];
        timeToHire: number[];
      }
    >();

    applications.forEach((app) => {
      const source = app.source || ApplicationSource.OTHER;
      if (!sourceStats.has(source)) {
        sourceStats.set(source, {
          applications: [],
          hires: [],
          matchingScores: [],
          timeToHire: [],
        });
      }
      sourceStats.get(source)!.applications.push(app);
      sourceStats
        .get(source)!
        .matchingScores.push(Number(app.matchingScore || 0));
    });

    hiredApplications.forEach((app) => {
      const source = app.source || ApplicationSource.OTHER;
      if (sourceStats.has(source)) {
        const stats = sourceStats.get(source)!;
        stats.hires.push(app);
        const appliedDate = new Date(app.appliedDate);
        const hiredDate = app.lastStatusChange
          ? new Date(app.lastStatusChange)
          : new Date();
        const days = Math.floor(
          (hiredDate.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        stats.timeToHire.push(days);
      }
    });

    const sources = Array.from(sourceStats.entries()).map(
      ([source, stats]) => ({
        source,
        totalApplications: stats.applications.length,
        totalHires: stats.hires.length,
        hireRate:
          stats.applications.length > 0
            ? (stats.hires.length / stats.applications.length) * 100
            : 0,
        averageMatchingScore:
          stats.matchingScores.length > 0
            ? stats.matchingScores.reduce((sum, score) => sum + score, 0) /
              stats.matchingScores.length
            : 0,
        averageTimeToHire:
          stats.timeToHire.length > 0
            ? stats.timeToHire.reduce((sum, days) => sum + days, 0) /
              stats.timeToHire.length
            : 0,
      }),
    );

    const topPerformingSources = sources
      .sort((a, b) => b.hireRate - a.hireRate)
      .slice(0, 3)
      .map((s) => s.source);

    return {
      sources,
      topPerformingSources,
    };
  }

  private calculatePipelineMetrics(
    applications: Application[],
  ): PipelineMetrics {
    const stageMap = new Map<
      string,
      {
        applications: Application[];
        transitions: Array<{ from: string; to: string; days: number }>;
      }
    >();

    applications.forEach((app) => {
      const stageKey = app.currentStageKey || app.status;
      if (!stageMap.has(stageKey)) {
        stageMap.set(stageKey, { applications: [], transitions: [] });
      }
      stageMap.get(stageKey)!.applications.push(app);

      // Calculate time in current stage
      if (app.pipelineStageHistory && app.pipelineStageHistory.length > 0) {
        const history = app.pipelineStageHistory;
        for (let i = 0; i < history.length - 1; i++) {
          const from = history[i];
          const to = history[i + 1];
          const days = Math.floor(
            (new Date(to.changedAt).getTime() -
              new Date(from.changedAt).getTime()) /
              (1000 * 60 * 60 * 24),
          );
          stageMap
            .get(stageKey)!
            .transitions.push({ from: from.stageKey, to: to.stageKey, days });
        }
      }
    });

    const stageMetrics = Array.from(stageMap.entries()).map(
      ([stageKey, data]) => {
        const avgTime =
          data.transitions.length > 0
            ? data.transitions.reduce((sum, t) => sum + t.days, 0) /
              data.transitions.length
            : 0;

        // Calculate conversion to next stage (simplified)
        const nextStageCount = applications.filter((app) => {
          const history = app.pipelineStageHistory || [];
          return history.some((h) => h.previousStageKey === stageKey);
        }).length;

        const conversionToNext =
          data.applications.length > 0
            ? (nextStageCount / data.applications.length) * 100
            : 0;

        return {
          stageName: data.applications[0]?.currentStageName || stageKey,
          stageKey,
          averageTimeInStage: Math.round(avgTime * 10) / 10,
          candidatesInStage: data.applications.length,
          conversionToNext: Math.round(conversionToNext * 10) / 10,
          dropOffRate: Math.round((100 - conversionToNext) * 10) / 10,
        };
      },
    );

    const bottlenecks = stageMetrics
      .filter((stage) => stage.averageTimeInStage > 7 || stage.dropOffRate > 50)
      .map((stage) => ({
        stageName: stage.stageName,
        averageTime: stage.averageTimeInStage,
        reason:
          stage.averageTimeInStage > 7
            ? 'High average time in stage'
            : 'High drop-off rate',
      }));

    return {
      stageMetrics,
      bottlenecks,
    };
  }

  private calculateQualityMetrics(
    applications: Application[],
    interviews: Interview[],
    offers: Offer[],
    hiredApplications: Application[],
  ) {
    const allMatchingScores = applications
      .map((app) => Number(app.matchingScore || 0))
      .filter((score) => score > 0);

    const hiredMatchingScores = hiredApplications
      .map((app) => Number(app.matchingScore || 0))
      .filter((score) => score > 0);

    const averageMatchingScore =
      allMatchingScores.length > 0
        ? allMatchingScores.reduce((sum, score) => sum + score, 0) /
          allMatchingScores.length
        : 0;

    const averageMatchingScoreOfHires =
      hiredMatchingScores.length > 0
        ? hiredMatchingScores.reduce((sum, score) => sum + score, 0) /
          hiredMatchingScores.length
        : 0;

    const acceptedOffers = offers.filter(
      (o) => o.status === OfferStatus.ACCEPTED,
    ).length;
    const offerAcceptanceRate =
      offers.length > 0 ? (acceptedOffers / offers.length) * 100 : 0;

    const completedInterviews = interviews.filter(
      (i) => i.status === InterviewStatus.COMPLETED,
    ).length;
    const interviewCompletionRate =
      interviews.length > 0
        ? (completedInterviews / interviews.length) * 100
        : 0;

    // Average interviews per hire
    const interviewsPerHire = hiredApplications.map((app) => {
      return interviews.filter((i) => i.applicationId === app.id).length;
    });
    const averageInterviewsPerHire =
      interviewsPerHire.length > 0
        ? interviewsPerHire.reduce((sum, count) => sum + count, 0) /
          interviewsPerHire.length
        : 0;

    return {
      averageMatchingScore: Math.round(averageMatchingScore * 10) / 10,
      averageMatchingScoreOfHires:
        Math.round(averageMatchingScoreOfHires * 10) / 10,
      offerAcceptanceRate: Math.round(offerAcceptanceRate * 10) / 10,
      interviewCompletionRate: Math.round(interviewCompletionRate * 10) / 10,
      averageInterviewsPerHire: Math.round(averageInterviewsPerHire * 10) / 10,
    };
  }

  private calculateChanges(
    current: HiringEffectivenessSummary,
    previous: HiringEffectivenessSummary,
  ) {
    const timeToHireChange =
      current.timeMetrics.average - previous.timeMetrics.average;
    const timeToHirePercentage =
      previous.timeMetrics.average > 0
        ? (timeToHireChange / previous.timeMetrics.average) * 100
        : 0;

    const conversionRateChange =
      current.conversionRates.overallFunnel -
      previous.conversionRates.overallFunnel;
    const conversionRatePercentage =
      previous.conversionRates.overallFunnel > 0
        ? (conversionRateChange / previous.conversionRates.overallFunnel) * 100
        : 0;

    const totalHiresChange =
      current.overview.totalHires - previous.overview.totalHires;
    const totalHiresPercentage =
      previous.overview.totalHires > 0
        ? (totalHiresChange / previous.overview.totalHires) * 100
        : 0;

    return {
      timeToHire: {
        change: Math.round(timeToHireChange * 10) / 10,
        percentage: Math.round(timeToHirePercentage * 10) / 10,
      },
      conversionRate: {
        change: Math.round(conversionRateChange * 10) / 10,
        percentage: Math.round(conversionRatePercentage * 10) / 10,
      },
      totalHires: {
        change: totalHiresChange,
        percentage: Math.round(totalHiresPercentage * 10) / 10,
      },
    };
  }
}
