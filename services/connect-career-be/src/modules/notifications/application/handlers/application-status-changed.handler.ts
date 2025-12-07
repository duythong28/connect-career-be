import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ApplicationStatusChangedEvent } from 'src/modules/applications/domain/events/application-status-changed.event';
import { NotificationOrchestratorService } from '../services/notification-orchstrator.service';
import {
  NotificationType,
  NotificationChannel,
} from '../../domain/entities/notification.entity';
import { ApplicationStatus } from 'src/modules/applications/domain/entities/application.entity';

@Injectable()
@EventsHandler(ApplicationStatusChangedEvent)
export class ApplicationStatusChangedHandler
  implements IEventHandler<ApplicationStatusChangedEvent>
{
  private readonly logger = new Logger(ApplicationStatusChangedHandler.name);

  constructor(
    private readonly notificationOrchestrator: NotificationOrchestratorService,
  ) {}

  async handle(event: ApplicationStatusChangedEvent) {
    this.logger.log(
      `Handling ApplicationStatusChangedEvent for application ${event.applicationId}: ${event.oldStatus} -> ${event.newStatus}`,
    );

    try {
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

      // Notify candidate
      await this.notificationOrchestrator.sendToRecipient(
        event.candidateId,
        {
          type: notificationType,
          channels: [NotificationChannel.EMAIL, NotificationChannel.WEBSOCKET],
          metadata: {
            applicationId: event.applicationId,
            jobId: event.jobId,
            jobTitle: event.jobTitle,
            oldStatus: event.oldStatus,
            newStatus: event.newStatus,
            reason: event.reason,
          },
        },
        event,
      );
    } catch (error) {
      this.logger.error(
        `Error handling ApplicationStatusChangedEvent: ${error.message}`,
        error.stack,
      );
    }
  }
}

