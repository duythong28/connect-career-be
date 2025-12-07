import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Inject } from '@nestjs/common';
import * as notificationRepository from 'src/modules/notifications/domain/repositories/notification.repository';
import { ProviderFactory } from 'src/modules/notifications/infrastructure/providers/common/provider.factory';
import { NotificationEntity, NotificationStatus, NotificationChannel, NotificationType } from 'src/modules/notifications/domain/entities/notification.entity';
import { NotificationTemplateService } from 'src/modules/notifications/application/services/notification-template.service';

export interface SendNotificationJobData {
  recipient: string;
  channel: NotificationChannel;
  title: string;
  message: string;
  htmlContent?: string;
  type?: string;
  metadata?: Record<string, any>;
  notificationId?: string; // If updating existing notification
}

@Processor('notifications')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    @Inject(notificationRepository.NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: notificationRepository.INotificationRepository,
    private readonly providerFactory: ProviderFactory,
    private readonly templateService: NotificationTemplateService,
  ) {
    super();
  }

  async process(job: Job<SendNotificationJobData>): Promise<void> {
    const { recipient, channel, title, message, htmlContent, type, metadata, notificationId } = job.data;
    
    this.logger.log(
      `Processing notification job ${job.id} for recipient ${recipient} via ${channel}`,
    );

    try {
      // Get or create notification record
      let notification: NotificationEntity;
      
      if (notificationId) {
        const foundNotification = await this.notificationRepository.findById(notificationId);
        if (!foundNotification) {
          throw new Error(`Notification ${notificationId} not found`);
        }
        notification = foundNotification;
      } else {
        // Create notification record with PENDING status
        notification = await this.notificationRepository.create({
          recipient,
          title,
          message,
          htmlContent: htmlContent || undefined,
          channel,
          type: type ? (type as NotificationType) : undefined,
          metadata,
          status: NotificationStatus.PENDING,
        });
      }

      // Get provider and send notification
      const provider = this.providerFactory.createProvider(channel);
      await provider.send(recipient, title, message);

      // Update notification status to SENT
      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();
      await this.notificationRepository.save(notification);

      this.logger.log(
        `Successfully sent notification ${notification.id} to ${recipient} via ${channel}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send notification to ${recipient} via ${channel}`,
        error,
      );

      // Update notification status to FAILED if it exists
      if (notificationId) {
        try {
          const notification = await this.notificationRepository.findById(notificationId);
          if (notification) {
            notification.status = NotificationStatus.FAILED;
            await this.notificationRepository.save(notification);
          }
        } catch (updateError) {
          this.logger.error('Failed to update notification status to FAILED', updateError);
        }
      }

      throw error; // Re-throw to trigger retry mechanism
    }
  }
}