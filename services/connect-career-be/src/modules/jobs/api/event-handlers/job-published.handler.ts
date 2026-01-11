import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { JobPublishedEvent } from 'src/modules/jobs/domain/events/job-published.event';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { NotificationOrchestratorService } from 'src/modules/notifications/application/services/notification-orchstrator.service';
import {
  NotificationChannel,
  NotificationType,
} from 'src/modules/notifications/domain/entities/notification.entity';

@Injectable()
@EventsHandler(JobPublishedEvent)
export class JobPublishedHandler implements IEventHandler<JobPublishedEvent> {
  private readonly logger = new Logger(JobPublishedHandler.name);

  constructor(
    private readonly notificationOrchestrator: NotificationOrchestratorService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async handle(event: JobPublishedEvent) {
    this.logger.log(
      `Handling JobPublishedEvent for job ${event.jobId}: ${event.jobTitle}`,
    );

    try {
      const matchingCandidates = await this.getMatchingCandidates(event.jobId);

      if (!matchingCandidates || matchingCandidates.length === 0) {
        this.logger.log(`No matching candidates found for job ${event.jobId}`);
        return;
      }

      this.logger.log(
        `Found ${matchingCandidates.length} matching candidates for job ${event.jobId}`,
      );

      // Get frontend URL for deep linking
      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'https://connect-career.vercel.app';
      const jobDeepLink = `${frontendUrl}/jobs/${event.jobId}`;

      // Send notifications to matching candidates
      for (const candidateId of matchingCandidates) {
        try {
          await this.notificationOrchestrator.sendToRecipient(
            candidateId,
            {
              type: NotificationType.JOB_RECOMMENDATION,
              channels: [
                NotificationChannel.EMAIL,
                NotificationChannel.WEBSOCKET,
                NotificationChannel.PUSH,
              ],
              metadata: {
                jobId: event.jobId,
                jobTitle: event.jobTitle,
                organizationId: event.organizationId,
                deepLink: jobDeepLink, // Add deep link for push notifications
              },
            },
            event,
          );
        } catch (error) {
          this.logger.error(
            `Failed to send notification to candidate ${candidateId} for job ${event.jobId}: ${error.message}`,
          );
          // Continue with other candidates even if one fails
        }
      }

      this.logger.log(
        `Sent job recommendation notifications to ${matchingCandidates.length} candidates for job ${event.jobId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error handling JobPublishedEvent: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async getMatchingCandidates(jobId: string): Promise<string[]> {
    try {
      const aiUrl =
        this.configService.get<string>('AI_RECOMMENDER_URL') ||
        'http://ai-service:8000';

      const { data } = await firstValueFrom(
        this.httpService.post<{ userIds: string[]; scores: number[] }>(
          `${aiUrl}/api/v1/jobs/${jobId}/candidates`,
          {
            limit: 5,
            excludeApplied: true,
            minScore: 0.5,
          },
        ),
      );

      return data.userIds || [];
    } catch (error) {
      this.logger.error(
        `Error getting matching candidates for job ${jobId}: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }
}
