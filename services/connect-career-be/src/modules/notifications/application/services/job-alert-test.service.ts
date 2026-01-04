import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from 'src/modules/identity/domain/entities';
import { UserNotificationPreferences } from '../../domain/entities/user-notification-preferences.entity';
import { Job } from 'src/modules/jobs/domain/entities/job.entity';
import { RecommendationService } from 'src/modules/recommendations/apis/service/recommendation.service';
import { JobAlertScheduler } from '../../infrastructure/schedulers/job-alert.scheduler';

export interface TestJobAlertOptions {
  sendEmail?: boolean;
  sendPush?: boolean;
  limit?: number;
}

export interface TestJobAlertResult {
  success: boolean;
  userId: string;
  userName?: string;
  jobsFound: number;
  jobs: Array<{
    id: string;
    title: string;
    company: string;
  }>;
  notificationsSent: {
    email: boolean;
    push: boolean;
  };
  message: string;
  suggestion?: string;
  emailError?: string;
  pushError?: string;
  error?: string;
}

@Injectable()
export class JobAlertTestService {
  private readonly logger = new Logger(JobAlertTestService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserNotificationPreferences)
    private readonly userNotificationPreferencesRepository: Repository<UserNotificationPreferences>,
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    private readonly recommendationService: RecommendationService,
    private readonly configService: ConfigService,
    private readonly jobAlertScheduler: JobAlertScheduler,
  ) {}

  async testJobAlertForUser(
    userId: string,
    options: TestJobAlertOptions = {},
  ): Promise<TestJobAlertResult> {
    try {
      const frontendBaseUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'https://app.connect-career.com';

      // Get user
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['roles'],
      });

      if (!user) {
        throw new BadRequestException(`User with ID ${userId} not found`);
      }

      if (!user.emailVerified) {
        throw new BadRequestException(`User ${userId} email is not verified`);
      }

      // Get user preferences
      const preferences = await this.userNotificationPreferencesRepository.findOne({
        where: { userId },
      });

      const userWithPrefs = {
        id: user.id,
        email: user.email,
        firstName: user.firstName || 'there',
        preferences: preferences,
      };

      // Get recommended jobs
      const recommendedJobIds = await this.recommendationService.getRecommendations(
        userId,
      );

      if (!recommendedJobIds || recommendedJobIds.length === 0) {
        return {
          success: false,
          userId,
          jobsFound: 0,
          jobs: [],
          notificationsSent: { email: false, push: false },
          message: `No job recommendations found for user ${userId}`,
        };
      }

      // Limit jobs (default 5, or from options)
      const limit = options.limit || 5;
      const topJobIds = recommendedJobIds.slice(0, limit);

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
        return {
          success: false,
          userId,
          jobsFound: 0,
          jobs: [],
          notificationsSent: { email: false, push: false },
          message: `No active jobs found for user ${userId}`,
        };
      }

      // Format jobs
      const formattedJobs = jobs.map((job) => ({
        id: job.id,
        title: job.title,
        company: job.organization?.name || 'Unknown Company',
        location: job.location || 'Location not specified',
        logoUrl: job.organization?.logoFile?.url || undefined,
        salary: this.formatJobSalary(job.salaryDetails),
        jobType: job.type || 'Full-time',
        seniorityLevel: job.seniorityLevel || undefined,
        jobUrl: `${frontendBaseUrl}/jobs/${job.id}`,
        postedDate: this.formatPostedDate(job.postedDate || job.createdAt),
      }));

      const result: TestJobAlertResult = {
        success: true,
        userId,
        userName: user.firstName || user.email,
        jobsFound: formattedJobs.length,
        jobs: formattedJobs.map((j) => ({
          id: j.id,
          title: j.title,
          company: j.company,
        })),
        notificationsSent: {
          email: false,
          push: false,
        },
        message: '',
      };

      // Determine which channels to use
      const sendEmail =
        options.sendEmail !== undefined
          ? options.sendEmail
          : preferences?.preferences?.email?.enabled &&
            preferences?.preferences?.email?.types?.includes(
              'job_recommendation',
            );

      const sendPush =
        options.sendPush !== undefined
          ? options.sendPush
          : preferences?.preferences?.push?.enabled &&
            preferences?.preferences?.push?.types?.includes(
              'job_recommendation',
            );

      // Send email notification
      if (sendEmail) {
        try {
          await this.jobAlertScheduler['sendEmailNotification'](
            userWithPrefs,
            formattedJobs,
            frontendBaseUrl,
          );
          result.notificationsSent.email = true;
        } catch (error) {
          this.logger.error(
            `Error sending email notification to user ${userId}:`,
            error,
          );
          result.emailError =
            error instanceof Error ? error.message : String(error);
        }
      }

      // Send push notification
      if (sendPush) {
        try {
          await this.jobAlertScheduler['sendPushNotification'](
            userWithPrefs,
            formattedJobs,
            frontendBaseUrl,
          );
          result.notificationsSent.push = true;
        } catch (error) {
          this.logger.error(
            `Error sending push notification to user ${userId}:`,
            error,
          );
          result.pushError =
            error instanceof Error ? error.message : String(error);
        }
      }

      if (!sendEmail && !sendPush) {
        result.message =
          'No notifications sent. User preferences may have email/push disabled for job_recommendation.';
        result.suggestion =
          'You can force send by setting sendEmail: true or sendPush: true in request body';
      } else {
        result.message = `Job recommendation alert sent successfully to user ${userId}`;
      }

      return result;
    } catch (error: any) {
      this.logger.error(`Failed to test job alert for user ${userId}:`, error);
      return {
        success: false,
        userId,
        jobsFound: 0,
        jobs: [],
        notificationsSent: { email: false, push: false },
        message: 'Failed to send job alert',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private formatJobSalary(salaryDetails: any): string | undefined {
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