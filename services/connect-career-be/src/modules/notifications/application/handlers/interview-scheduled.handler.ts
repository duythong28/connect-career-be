import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { InterviewScheduledEvent } from 'src/modules/applications/domain/events/interview-scheduled.event';
import { NotificationOrchestratorService } from '../services/notification-orchstrator.service';
import {
  NotificationType,
  NotificationChannel,
} from '../../domain/entities/notification.entity';

@Injectable()
@EventsHandler(InterviewScheduledEvent)
export class InterviewScheduledHandler
  implements IEventHandler<InterviewScheduledEvent>
{
  private readonly logger = new Logger(InterviewScheduledHandler.name);

  constructor(
    private readonly notificationOrchestrator: NotificationOrchestratorService,
  ) {}

  async handle(event: InterviewScheduledEvent) {
    this.logger.log(
      `Handling InterviewScheduledEvent for interview ${event.interviewId}`,
    );

    try {
      // Notify candidate
      await this.notificationOrchestrator.sendToRecipient(
        event.candidateId,
        {
          type: NotificationType.INTERVIEW_SCHEDULED,
          channels: [NotificationChannel.EMAIL, NotificationChannel.WEBSOCKET],
          metadata: {
            interviewId: event.interviewId,
            applicationId: event.applicationId,
            jobId: event.jobId,
            jobTitle: event.jobTitle,
            scheduledDate: event.scheduledDate.toISOString(),
            interviewType: event.interviewType,
            interviewerName: event.interviewerName,
            location: event.location,
            meetingLink: event.meetingLink,
            duration: event.duration,
          },
        },
        event,
      );

      // Notify interviewer if available
      if (event.interviewerId) {
        await this.notificationOrchestrator.sendToRecipient(
          event.interviewerId,
          {
            type: NotificationType.INTERVIEW_SCHEDULED,
            channels: [NotificationChannel.EMAIL, NotificationChannel.WEBSOCKET],
            metadata: {
              interviewId: event.interviewId,
              applicationId: event.applicationId,
              candidateId: event.candidateId,
              jobId: event.jobId,
              jobTitle: event.jobTitle,
              scheduledDate: event.scheduledDate.toISOString(),
              interviewType: event.interviewType,
              location: event.location,
              meetingLink: event.meetingLink,
              duration: event.duration,
            },
          },
          event,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error handling InterviewScheduledEvent: ${error.message}`,
        error.stack,
      );
    }
  }
}

