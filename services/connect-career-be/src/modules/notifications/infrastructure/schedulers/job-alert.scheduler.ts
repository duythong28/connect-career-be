import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { render } from '@react-email/render';
import { UserNotificationPreferences } from '../../domain/entities/user-notification-preferences.entity';
import { User } from 'src/modules/identity/domain/entities';
import { Job } from 'src/modules/jobs/domain/entities/job.entity';
import { NotificationOrchestratorService } from '../../application/services/notification-orchstrator.service';
import { NotificationType, NotificationChannel } from '../../domain/entities/notification.entity';
import { JobAlertEmail } from '../providers/common/template/job-alert.template';
import { RecommendationService } from 'src/modules/recommendations/apis/service/recommendation.service';

@Injectable()
export class JobAlertScheduler {
  private readonly logger = new Logger(JobAlertScheduler.name);

  constructor(
    @InjectRepository(UserNotificationPreferences)
    private readonly preferencesRepository: Repository<UserNotificationPreferences>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    private readonly configService: ConfigService,
    private readonly notificationOrchestrator: NotificationOrchestratorService,
    private readonly recommendationService: RecommendationService,
  ) {}

  // Run at 8 AM, 2 PM, and 8 PM daily
  @Cron('0 8,14,20 * * *')
  async sendJobAlerts() {
    await this.executeJobAlerts();
  }

  async executeJobAlerts() {
    this.logger.log('Starting job alert cron job...');

    try {
      const frontendBaseUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'https://localhost:3000';

      // Get users who have job alert notifications enabled
      const usersWithAlerts = await this.getUsersWithJobAlertsEnabled();

      this.logger.log(
        `Found ${usersWithAlerts.length} users with job alerts enabled`,
      );

      let successCount = 0;
      let errorCount = 0;

      // Process users in batches to avoid overwhelming the system
      const batchSize = 10;
      for (let i = 0; i < usersWithAlerts.length; i += batchSize) {
        const batch = usersWithAlerts.slice(i, i + batchSize);
        await Promise.allSettled(
          batch.map((user) =>
            this.sendJobAlertToUser(user, frontendBaseUrl).catch((error) => {
              this.logger.error(
                `Failed to send job alert to user ${user.id}:`,
                error,
              );
              errorCount++;
            }),
          ),
        );
        successCount += batch.length - errorCount;

        // Small delay between batches to avoid rate limiting
        if (i + batchSize < usersWithAlerts.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      this.logger.log(
        `Job alert cron job completed. Success: ${successCount}, Errors: ${errorCount}`,
      );
    } catch (error) {
      this.logger.error('Error in job alert cron job:', error);
    }
  }

  private async getUsersWithJobAlertsEnabled(): Promise<
    Array<{ id: string; email: string; firstName: string; preferences: UserNotificationPreferences }>
  > {
    // Get users who have email or push notifications enabled for job recommendations
    const preferences = await this.preferencesRepository
      .createQueryBuilder('prefs')
      .where(
        `(prefs.preferences->'email'->>'enabled' = 'true' AND 'job_recommendation' = ANY(ARRAY(SELECT jsonb_array_elements_text(prefs.preferences->'email'->'types')))) OR 
        (prefs.preferences->'push'->>'enabled' = 'true' AND 'job_recommendation' = ANY(ARRAY(SELECT jsonb_array_elements_text(prefs.preferences->'push'->'types'))))`,
      )
      .getMany();

    // Get user details
    const userIds = preferences.map((p) => p.userId);
    if (userIds.length === 0) {
      return [];
    }

    const users = await this.userRepository
      .createQueryBuilder('user')
      .where('user.id IN (:...userIds)', { userIds })
      .andWhere('user.email IS NOT NULL')
      .andWhere('user.emailVerified = true')
      .getMany();

    // Map users with their preferences
    return users.map((user) => {
      const userPrefs = preferences.find((p) => p.userId === user.id);
      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName || 'there',
        preferences: userPrefs!,
      };
    });
  }

  private async sendJobAlertToUser(
    user: { id: string; email: string; firstName: string; preferences: UserNotificationPreferences },
    frontendBaseUrl: string,
  ): Promise<void> {
    try {
      // Get recommended jobs for user
      const recommendedJobIds = await this.recommendationService.getRecommendations(
        user.id,
      );

      if (!recommendedJobIds || recommendedJobIds.length === 0) {
        this.logger.debug(`No recommendations for user ${user.id}`);
        return;
      }

      // Limit to top 5 jobs for email
      const topJobIds = recommendedJobIds.slice(0, 5);

      // Fetch job details from database
      const jobs = await this.jobRepository
        .createQueryBuilder('job')
        .leftJoinAndSelect('job.organization', 'org')
        .leftJoinAndSelect('org.logoFile', 'logoFile')
        .leftJoinAndSelect('org.industry', 'industry')
        .where('job.id IN (:...jobIds)', { jobIds: topJobIds })
        .andWhere('job.status = :status', { status: 'active' })
        .andWhere('(job.deletedAt IS NULL OR job.deletedAt > NOW())')
        .getMany();

      if (jobs.length === 0) {
        this.logger.debug(`No active jobs found for user ${user.id}`);
        return;
      }

      // Format jobs for email template
      const formattedJobs = jobs.map((job) => ({
        id: job.id,
        title: job.title,
        company: job.organization?.name || 'Unknown Company',
        location: job.location || 'Location not specified',
        logoUrl: job.organization?.logoFile?.url || undefined,
        salary: this.formatSalary(job.salaryDetails),
        jobType: job.type || 'Full-time',
        seniorityLevel: job.seniorityLevel || undefined,
        jobUrl: `${frontendBaseUrl}/jobs/${job.id}`,
        postedDate: this.formatPostedDate(job.postedDate || new Date()),
      }));

      // Check user preferences to determine which channels to use
      const emailEnabled =
        user.preferences?.preferences?.email?.enabled &&
        user.preferences?.preferences?.email?.types?.includes(
          'job_recommendation',
        );
      const pushEnabled =
        user.preferences?.preferences?.push?.enabled &&
        user.preferences?.preferences?.push?.types?.includes(
          'job_recommendation',
        );

      // Send email notification
      if (emailEnabled) {
        await this.sendEmailNotification(
          user,
          formattedJobs,
          frontendBaseUrl,
        );
      }

      // Send push notification
      if (pushEnabled) {
        await this.sendPushNotification(user, formattedJobs, frontendBaseUrl);
      }
    } catch (error) {
      this.logger.error(
        `Error sending job alert to user ${user.id}:`,
        error,
      );
      throw error;
    }
  }

  private async sendEmailNotification(
    user: { id: string; email: string; firstName: string },
    jobs: any[],
    frontendBaseUrl: string,
  ): Promise<void> {
    try {
      // Render the email template
      const emailHtml = await render(
        JobAlertEmail({
          userFirstname: user.firstName,
          jobs: jobs,
          viewAllJobsUrl: `${frontendBaseUrl}/jobs`,
        }),
      );

      // Send via notification orchestrator
      await this.notificationOrchestrator.sendToRecipient(
        user.id,
        {
          type: NotificationType.JOB_RECOMMENDATION,
          channels: [NotificationChannel.EMAIL],
          metadata: {
            jobIds: jobs.map((j) => j.id),
            jobCount: jobs.length,
            emailHtml: emailHtml, // Pass the rendered HTML
          },
        },
        {
          constructor: { name: 'JobAlertEvent' },
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          jobs: jobs,
          emailHtml: emailHtml, // Also pass in event data
        } as any,
      );
    } catch (error) {
      this.logger.error(
        `Error sending email notification to user ${user.id}:`,
        error,
      );
      throw error;
    }
  }

  private async sendPushNotification(
    user: { id: string; email: string; firstName: string },
    jobs: any[],
    frontendBaseUrl: string,
  ): Promise<void> {
    try {
      const jobTitles = jobs
        .slice(0, 3)
        .map((j) => j.title)
        .join(', ');
      const title = `${jobs.length} new job${jobs.length !== 1 ? 's' : ''} matching your profile`;
      const message =
        jobs.length > 3
          ? `${jobTitles} and ${jobs.length - 3} more...`
          : jobTitles;

      await this.notificationOrchestrator.sendToRecipient(
        user.id,
        {
          type: NotificationType.JOB_RECOMMENDATION,
          channels: [NotificationChannel.PUSH],
          metadata: {
            jobIds: jobs.map((j) => j.id),
            jobCount: jobs.length,
            deepLink: `${frontendBaseUrl}/jobs`,
          },
        },
        {
          constructor: { name: 'JobAlertEvent' },
          userId: user.id,
          title,
          message,
        } as any,
      );
    } catch (error) {
      this.logger.error(
        `Error sending push notification to user ${user.id}:`,
        error,
      );
      throw error;
    }
  }

  private formatSalary(salaryDetails: any): string | undefined {
    if (!salaryDetails) return undefined;

    const min = salaryDetails.minAmount;
    const max = salaryDetails.maxAmount;
    const currency = salaryDetails.currency || 'USD';

    if (min && max) {
      return `${currency} ${min.toLocaleString()} - ${currency} ${max.toLocaleString()}`;
    } else if (min) {
      return `From ${currency} ${min.toLocaleString()}`;
    }

    return undefined;
  }

  private formatPostedDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
    }
    const months = Math.floor(diffDays / 30);
    return `${months} month${months !== 1 ? 's' : ''} ago`;
  }
}