import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ApplicationCreatedEvent } from 'src/modules/applications/domain/events/application-created.event';
import { NotificationOrchestratorService } from '../services/notification-orchstrator.service';
import { NotificationType, NotificationChannel } from '../../domain/entities/notification.entity';

@Injectable()
@EventsHandler(ApplicationCreatedEvent)
export class ApplicationCreatedHandler
  implements IEventHandler<ApplicationCreatedEvent>
{
  private readonly logger = new Logger(ApplicationCreatedHandler.name);

  constructor(
    private readonly notificationOrchestrator: NotificationOrchestratorService,
  ) {}

  async handle(event: ApplicationCreatedEvent) {
    this.logger.log(
      `Handling ApplicationCreatedEvent for application ${event.applicationId}`,
    );

    try {
      // Notify candidate
      await this.notificationOrchestrator.sendToRecipient(
        event.candidateId,
        {
          type: NotificationType.APPLICATION_RECEIVED,
          channels: [NotificationChannel.EMAIL, NotificationChannel.WEBSOCKET],
          metadata: {
            applicationId: event.applicationId,
            jobId: event.jobId,
            jobTitle: event.jobTitle,
          },
        },
        event,
      );

      // Notify recruiter if available
      if (event.recruiterId) {
        await this.notificationOrchestrator.sendToRecipient(
          event.recruiterId,
          {
            type: NotificationType.APPLICATION_RECEIVED,
            channels: [NotificationChannel.EMAIL, NotificationChannel.WEBSOCKET],
            metadata: {
              applicationId: event.applicationId,
              candidateId: event.candidateId,
              jobId: event.jobId,
              jobTitle: event.jobTitle,
            },
          },
          event,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error handling ApplicationCreatedEvent: ${error.message}`,
        error.stack,
      );
    }
  }
}

