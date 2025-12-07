import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OfferRejectedEvent } from 'src/modules/applications/domain/events/offer-rejected.event';
import { NotificationOrchestratorService } from '../services/notification-orchstrator.service';
import {
  NotificationType,
  NotificationChannel,
} from '../../domain/entities/notification.entity';

@Injectable()
@EventsHandler(OfferRejectedEvent)
export class OfferRejectedHandler implements IEventHandler<OfferRejectedEvent> {
  private readonly logger = new Logger(OfferRejectedHandler.name);

  constructor(
    private readonly notificationOrchestrator: NotificationOrchestratorService,
  ) {}

  async handle(event: OfferRejectedEvent) {
    this.logger.log(`Handling OfferRejectedEvent for offer ${event.offerId}`);

    try {
      // Notify recruiter/employer (we need to get the recruiter ID from the job)
      // For now, we'll notify the candidate as well
      await this.notificationOrchestrator.sendToRecipient(
        event.candidateId,
        {
          type: NotificationType.OFFER_REJECTED,
          channels: [NotificationChannel.EMAIL, NotificationChannel.WEBSOCKET],
          metadata: {
            offerId: event.offerId,
            applicationId: event.applicationId,
            jobId: event.jobId,
            jobTitle: event.jobTitle,
            rejectionReason: event.rejectionReason,
          },
        },
        event,
      );
    } catch (error) {
      this.logger.error(
        `Error handling OfferRejectedEvent: ${error.message}`,
        error.stack,
      );
    }
  }
}

