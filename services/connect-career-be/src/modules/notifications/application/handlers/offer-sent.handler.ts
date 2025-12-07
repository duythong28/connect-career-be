import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OfferSentEvent } from 'src/modules/applications/domain/events/offer-sent.event';
import { NotificationOrchestratorService } from '../services/notification-orchstrator.service';
import {
  NotificationType,
  NotificationChannel,
} from '../../domain/entities/notification.entity';

@Injectable()
@EventsHandler(OfferSentEvent)
export class OfferSentHandler implements IEventHandler<OfferSentEvent> {
  private readonly logger = new Logger(OfferSentHandler.name);

  constructor(
    private readonly notificationOrchestrator: NotificationOrchestratorService,
  ) {}

  async handle(event: OfferSentEvent) {
    this.logger.log(`Handling OfferSentEvent for offer ${event.offerId}`);

    try {
      // Notify candidate
      await this.notificationOrchestrator.sendToRecipient(
        event.candidateId,
        {
          type: NotificationType.OFFER_SENT,
          channels: [NotificationChannel.EMAIL, NotificationChannel.WEBSOCKET],
          metadata: {
            offerId: event.offerId,
            applicationId: event.applicationId,
            jobId: event.jobId,
            jobTitle: event.jobTitle,
            baseSalary: event.baseSalary,
            currency: event.currency,
          },
        },
        event,
      );
    } catch (error) {
      this.logger.error(
        `Error handling OfferSentEvent: ${error.message}`,
        error.stack,
      );
    }
  }
}

