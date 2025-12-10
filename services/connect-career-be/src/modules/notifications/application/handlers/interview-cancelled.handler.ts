import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { InterviewCancelledEvent } from 'src/modules/applications/domain/events/interview-cancelled.event';
import { NotificationOrchestratorService } from '../services/notification-orchstrator.service';
import {
  NotificationType,
  NotificationChannel,
} from '../../domain/entities/notification.entity';

@Injectable()
@EventsHandler(InterviewCancelledEvent)
export class InterviewCancelledHandler
  implements IEventHandler<InterviewCancelledEvent>
{
  private readonly logger = new Logger(InterviewCancelledHandler.name);

  constructor(
    private readonly notificationOrchestrator: NotificationOrchestratorService,
  ) {}

  async handle(event: InterviewCancelledEvent) {
    this.logger.log(
      `Handling InterviewCancelledEvent for interview ${event.interviewId}`,
    );

    try {
      // Notify candidate
      await this.notificationOrchestrator.sendToRecipient(
        event.candidateId,
        {
          type: NotificationType.INTERVIEW_CANCELLED,
          channels: [NotificationChannel.EMAIL, NotificationChannel.WEBSOCKET],
          metadata: {
            interviewId: event.interviewId,
            applicationId: event.applicationId,
            jobId: event.jobId,
            jobTitle: event.jobTitle,
            cancellationReason: event.cancellationReason,
          },
        },
        event,
      );
    } catch (error) {
      this.logger.error(
        `Error handling InterviewCancelledEvent: ${error.message}`,
        error.stack,
      );
    }
  }
}
