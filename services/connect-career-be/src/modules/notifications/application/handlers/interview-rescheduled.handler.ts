import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { InterviewRescheduledEvent } from 'src/modules/applications/domain/events/interview-rescheduled.event';
import { NotificationOrchestratorService } from '../services/notification-orchstrator.service';
import {
  NotificationType,
  NotificationChannel,
} from '../../domain/entities/notification.entity';

@Injectable()
@EventsHandler(InterviewRescheduledEvent)
export class InterviewRescheduledHandler
  implements IEventHandler<InterviewRescheduledEvent>
{
  private readonly logger = new Logger(InterviewRescheduledHandler.name);

  constructor(
    private readonly notificationOrchestrator: NotificationOrchestratorService,
  ) {}

  async handle(event: InterviewRescheduledEvent) {
    this.logger.log(
      `Handling InterviewRescheduledEvent for interview ${event.interviewId}`,
    );

    try {
      // Notify candidate
      await this.notificationOrchestrator.sendToRecipient(
        event.candidateId,
        {
          type: NotificationType.INTERVIEW_RESCHEDULED,
          channels: [NotificationChannel.EMAIL, NotificationChannel.WEBSOCKET],
          metadata: {
            interviewId: event.interviewId,
            applicationId: event.applicationId,
            jobId: event.jobId,
            jobTitle: event.jobTitle,
            oldScheduledDate: event.oldScheduledDate.toISOString(),
            newScheduledDate: event.newScheduledDate.toISOString(),
          },
        },
        event,
      );
    } catch (error) {
      this.logger.error(
        `Error handling InterviewRescheduledEvent: ${error.message}`,
        error.stack,
      );
    }
  }
}
