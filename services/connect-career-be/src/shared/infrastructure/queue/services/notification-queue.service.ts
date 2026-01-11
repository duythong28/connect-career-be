import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SendNotificationJobData } from '../processors/notification.processor';

@Injectable()
export class NotificationQueueService {
  constructor(
    @InjectQueue('notifications')
    private readonly notificationQueue: Queue<SendNotificationJobData>,
  ) {}

  async queueNotification(data: SendNotificationJobData): Promise<void> {
    await this.notificationQueue.add('send-notification', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000, // Start with 2 seconds, then 4, 8, etc.
      },
      removeOnComplete: {
        age: 3600, // Keep completed jobs for 1 hour
        count: 1000,
      },
      removeOnFail: {
        age: 86400, // Keep failed jobs for 24 hours
      },
    });
  }

  async scheduleNotification(
    data: SendNotificationJobData,
    delay: number, // Delay in milliseconds
  ): Promise<void> {
    await this.notificationQueue.add('send-notification', data, {
      delay,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        age: 3600,
        count: 1000,
      },
      removeOnFail: {
        age: 86400,
      },
    });
  }

  async scheduleNotificationAt(
    data: SendNotificationJobData,
    scheduledAt: Date,
  ): Promise<void> {
    const now = new Date();
    const delay = scheduledAt.getTime() - now.getTime();

    if (delay <= 0) {
      // If scheduled time is in the past, send immediately
      return this.queueNotification(data);
    }

    return this.scheduleNotification(data, delay);
  }

  async queueBulkNotifications(
    notifications: SendNotificationJobData[],
  ): Promise<void> {
    const jobs = notifications.map((data) => ({
      name: 'send-notification',
      data,
      opts: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 3600,
          count: 1000,
        },
        removeOnFail: {
          age: 86400,
        },
      },
    }));

    await this.notificationQueue.addBulk(jobs);
  }

  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.notificationQueue.getWaitingCount(),
      this.notificationQueue.getActiveCount(),
      this.notificationQueue.getCompletedCount(),
      this.notificationQueue.getFailedCount(),
      this.notificationQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  }
}
