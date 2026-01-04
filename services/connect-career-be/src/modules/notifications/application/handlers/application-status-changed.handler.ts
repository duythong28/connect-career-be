import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ApplicationStatusChangedEvent } from 'src/modules/applications/domain/events/application-status-changed.event';
import { NotificationOrchestratorService } from '../services/notification-orchstrator.service';
import {
  NotificationType,
  NotificationChannel,
} from '../../domain/entities/notification.entity';
import { ApplicationStatus } from 'src/modules/applications/domain/entities/application.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'src/modules/jobs/domain/entities/job.entity';

@Injectable()
@EventsHandler(ApplicationStatusChangedEvent)
export class ApplicationStatusChangedHandler
  implements IEventHandler<ApplicationStatusChangedEvent>
{
  private readonly logger = new Logger(ApplicationStatusChangedHandler.name);

  constructor(
    private readonly notificationOrchestrator: NotificationOrchestratorService,
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
  ) {}

  async handle(event: ApplicationStatusChangedEvent) {
    this.logger.log(
      `Handling ApplicationStatusChangedEvent for application ${event.applicationId}: ${event.oldStatus} -> ${event.newStatus}`,
    );

    try {
      // Get job to fetch recruiter information
      const job = await this.jobRepository.findOne({
        where: { id: event.jobId },
        select: ['id', 'userId', 'title'],
      });

      if (!job) {
        this.logger.warn(
          `Job ${event.jobId} not found for application ${event.applicationId}`,
        );
        return;
      }

      // Map status to notification type
      let notificationType: NotificationType;
      switch (event.newStatus) {
        case ApplicationStatus.SHORTLISTED:
          notificationType = NotificationType.APPLICATION_SHORTLISTED;
          break;
        case ApplicationStatus.REJECTED:
          notificationType = NotificationType.APPLICATION_REJECTED;
          break;
        case ApplicationStatus.HIRED:
          notificationType = NotificationType.APPLICATION_HIRED;
          break;
        default:
          notificationType = NotificationType.APPLICATION_STATUS_CHANGED;
      }

      // Prepare metadata for notifications
      const metadata = {
        applicationId: event.applicationId,
        jobId: event.jobId,
        jobTitle: event.jobTitle,
        oldStatus: event.oldStatus,
        newStatus: event.newStatus,
        reason: event.reason,
        changedBy: event.changedBy,
      };

      // Notify candidate - all status changes
      await this.notificationOrchestrator.sendToRecipient(
        event.candidateId,
        {
          type: notificationType,
          channels: [
            NotificationChannel.EMAIL,
            NotificationChannel.WEBSOCKET,
            NotificationChannel.PUSH,
          ],
          metadata,
        },
        event,
      );

      // Notify recruiter - all status changes
      if (job.userId) {
        await this.notificationOrchestrator.sendToRecipient(
          job.userId,
          {
            type: NotificationType.APPLICATION_STATUS_CHANGED,
            channels: [
              NotificationChannel.EMAIL,
              NotificationChannel.WEBSOCKET,
              NotificationChannel.PUSH,
            ],
            metadata: {
              ...metadata,
              candidateId: event.candidateId,
            },
          },
          event,
        );
      }

      this.logger.log(
        `Successfully sent notifications for application ${event.applicationId} status change from ${event.oldStatus} to ${event.newStatus}`,
      );
    } catch (error) {
      this.logger.error(
        `Error handling ApplicationStatusChangedEvent: ${error.message}`,
        error.stack,
      );
    }
  }
}
