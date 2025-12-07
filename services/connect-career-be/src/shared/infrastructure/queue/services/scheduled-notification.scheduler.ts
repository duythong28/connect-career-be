import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationQueueService } from './notification-queue.service';
import { NotificationEntity, NotificationStatus } from 'src/modules/notifications/domain/entities/notification.entity';

@Injectable()
export class ScheduledNotificationScheduler {
  private readonly logger = new Logger(ScheduledNotificationScheduler.name);

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
    private readonly notificationQueueService: NotificationQueueService,
  ) {}

  // Check for scheduled notifications every minute
  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledNotifications() {
    this.logger.debug('Checking for scheduled notifications...');

    try {
      const now = new Date();
      
      // Find notifications scheduled to be sent now or in the past
      const scheduledNotifications = await this.notificationRepository
        .createQueryBuilder('notification')
        .where('notification.status = :status', { status: NotificationStatus.SCHEDULED })
        .andWhere('notification.scheduledAt <= :now', { now })
        .andWhere('notification.scheduledAt IS NOT NULL')
        .orderBy('notification.scheduledAt', 'ASC')
        .limit(100) // Process 100 at a time
        .getMany();

      if (scheduledNotifications.length === 0) {
        this.logger.debug('No scheduled notifications to process');
        return;
      }

      this.logger.log(
        `Processing ${scheduledNotifications.length} scheduled notifications`,
      );

      for (const notification of scheduledNotifications) {
        try {
          // Queue the notification for immediate processing
          await this.notificationQueueService.queueNotification({
            recipient: notification.recipient,
            channel: notification.channel,
            title: notification.title,
            message: notification.message,
            htmlContent: notification.htmlContent || undefined,
            type: notification.type || undefined,
            metadata: notification.metadata || undefined,
            notificationId: notification.id,
          });

          this.logger.log(
            `Queued scheduled notification ${notification.id} for processing`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to queue scheduled notification ${notification.id}`,
            error,
          );
          
          // Mark as failed if we can't queue it
          notification.status = NotificationStatus.FAILED;
          await this.notificationRepository.save(notification);
        }
      }
    } catch (error) {
      this.logger.error('Error processing scheduled notifications', error);
    }
  }

  // Clean up old completed/failed notifications daily at 3 AM
  @Cron('0 3 * * *')
  async cleanupOldNotifications() {
    this.logger.log('Cleaning up old notifications...');

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.notificationRepository
        .createQueryBuilder()
        .delete()
        .where('status IN (:...statuses)', {
          statuses: [NotificationStatus.SENT, NotificationStatus.READ, NotificationStatus.FAILED],
        })
        .andWhere('createdAt < :date', { date: thirtyDaysAgo })
        .execute();

      this.logger.log(`Cleaned up ${result.affected || 0} old notifications`);
    } catch (error) {
      this.logger.error('Error cleaning up old notifications', error);
    }
  }
}