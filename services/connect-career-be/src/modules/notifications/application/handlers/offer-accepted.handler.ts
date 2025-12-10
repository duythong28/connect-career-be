import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OfferAcceptedEvent } from 'src/modules/applications/domain/events/offer-accepted.event';
import { NotificationOrchestratorService } from '../services/notification-orchstrator.service';
import {
  NotificationType,
  NotificationChannel,
} from '../../domain/entities/notification.entity';

@Injectable()
@EventsHandler(OfferAcceptedEvent)
export class OfferAcceptedHandler implements IEventHandler<OfferAcceptedEvent> {
  private readonly logger = new Logger(OfferAcceptedHandler.name);

  constructor(
    private readonly notificationOrchestrator: NotificationOrchestratorService,
  ) {}

  async handle(event: OfferAcceptedEvent) {
    this.logger.log(`Handling OfferAcceptedEvent for offer ${event.offerId}`);

    try {
      // Notify recruiter/employer (we need to get the recruiter ID from the job)
      // For now, we'll notify the candidate as well
      await this.notificationOrchestrator.sendToRecipient(
        event.candidateId,
        {
          type: NotificationType.OFFER_ACCEPTED,
          channels: [NotificationChannel.EMAIL, NotificationChannel.WEBSOCKET],
          metadata: {
            offerId: event.offerId,
            applicationId: event.applicationId,
            jobId: event.jobId,
            jobTitle: event.jobTitle,
          },
        },
        event,
      );
    } catch (error) {
      this.logger.error(
        `Error handling OfferAcceptedEvent: ${error.message}`,
        error.stack,
      );
    }
  }
}
