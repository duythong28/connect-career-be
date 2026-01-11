import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationEntity,
  NotificationType,
  NotificationStatus,
} from '../../domain/entities/notification.entity';
import { EventBus } from '@nestjs/cqrs';
import { IDomainEvent } from 'src/shared/domain';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserNotificationPreferences } from '../../domain/entities/user-notification-preferences.entity';
import { ProviderFactory } from '../../infrastructure/providers/common/provider.factory';
import { NotificationTemplateService } from './notification-template.service';
import { NotificationQueueService } from 'src/shared/infrastructure/queue/services/notification-queue.service';
import { User } from 'src/modules/identity/domain/entities';

export interface NotificationConfig {
  type: NotificationType;
  channels: NotificationChannel[];
  metadata?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high';
}

@Injectable()
export class NotificationOrchestratorService {
  private readonly logger = new Logger(NotificationOrchestratorService.name);

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
    @InjectRepository(UserNotificationPreferences)
    private readonly userNotificationPreferencesRepository: Repository<UserNotificationPreferences>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly providerFactory: ProviderFactory,
    private readonly eventBus: EventBus,
    private readonly templateService: NotificationTemplateService,
    private readonly notificationQueueService: NotificationQueueService,
  ) {}

  async handleDomainEvent(event: IDomainEvent): Promise<void> {
    try {
      const notificationConfig = this.mapEventToNotification(event);
      if (!notificationConfig) {
        return;
      }

      const recipients = await this.getRecipients(event);

      for (const recipient of recipients) {
        await this.sendToRecipient(recipient, notificationConfig, event);
      }
    } catch (error) {
      this.logger.error(
        `Error handling domain event: ${event.constructor.name}`,
        error,
      );
      throw error;
    }
  }

  async sendToRecipient(
    userId: string,
    config: NotificationConfig,
    event: IDomainEvent,
  ): Promise<void> {
    const preferences = await this.getOrCreatePreferences(userId);
    const channels = this.selectChannels(
      config.type,
      config.channels,
      preferences,
    );

    for (const channel of channels) {
      try {
        await this.sendViaChannel(userId, channel, config, event, preferences);
      } catch (error) {
        this.logger.error(
          `Failed to send via ${channel} to user ${userId}`,
          error,
        );
      }
    }
  }

  async sendViaChannel(
    userId: string,
    channel: NotificationChannel,
    config: NotificationConfig,
    event: IDomainEvent,
    preferences: UserNotificationPreferences,
  ): Promise<void> {
    try {
      const eventData = event as any;
      if (config.metadata?.emailHtml && !eventData.emailHtml) {
        eventData.emailHtml = config.metadata.emailHtml;
      }
      
      // Also merge other metadata fields that might be needed
      if (config.metadata?.jobs && !eventData.jobs) {
        eventData.jobs = config.metadata.jobs;
      }
      if (config.metadata?.jobIds && !eventData.jobIds) {
        eventData.jobIds = config.metadata.jobIds;
      }  
      const template = await this.templateService.getTemplate(
        config.type,
        channel,
        event,
      );

      const recipientIdentifier = await this.getRecipientIdentifier(
        userId,
        channel,
      );

      // Create notification record
      const notification = this.notificationRepository.create({
        recipient: userId,
        title: template.title,
        message: template.message,
        htmlContent: template.htmlContent || undefined,
        channel,
        type: config.type,
        metadata: config.metadata,
        status: NotificationStatus.PENDING,
      });

      await this.notificationRepository.save(notification);
      const queueData = {
        recipient: recipientIdentifier,
        channel,
        title: template.title,
        message: template.message,
        htmlContent: template.htmlContent || undefined,
        type: config.type,
        metadata: config.metadata,
        notificationId: notification.id,
      };
      console.log(`Queuing ${channel} notification:`, {
        hasHtmlContent: !!queueData.htmlContent,
        htmlContentLength: queueData.htmlContent?.length || 0,
        notificationId: notification.id,
      });

      // Queue notification for async processing
      await this.notificationQueueService.queueNotification({
        recipient: recipientIdentifier,
        channel,
        title: template.title,
        message: template.message,
        type: config.type,
        metadata: config.metadata,
        notificationId: notification.id,
      });
    } catch (error) {
      this.logger.error(
        `Error sending notification via channel: ${channel}`,
        error,
      );
      throw error;
    }
  }

  private mapEventToNotification(
    event: IDomainEvent,
  ): NotificationConfig | null {
    const eventName = event.constructor.name;

    // Map domain events to notification types
    const eventMapping: Record<string, NotificationConfig> = {
      ApplicationCreatedEvent: {
        type: NotificationType.APPLICATION_RECEIVED,
        channels: [NotificationChannel.EMAIL, NotificationChannel.WEBSOCKET],
      },
      ApplicationStatusChangedEvent: {
        type: NotificationType.APPLICATION_STATUS_CHANGED,
        channels: [
          NotificationChannel.EMAIL,
          NotificationChannel.WEBSOCKET,
          NotificationChannel.PUSH,
        ],
      },
      InterviewScheduledEvent: {
        type: NotificationType.INTERVIEW_SCHEDULED,
        channels: [
          NotificationChannel.EMAIL,
          NotificationChannel.WEBSOCKET,
          NotificationChannel.PUSH,
        ],
      },
      // Add more mappings as needed
    };

    return eventMapping[eventName] || null;
  }

  private async getRecipients(event: IDomainEvent): Promise<string[]> {
    // Extract recipient IDs from event
    const eventData = event as any;

    if (eventData.userId) {
      return [eventData.userId];
    }

    if (eventData.recipientIds) {
      return eventData.recipientIds;
    }

    return [];
  }

  private selectChannels(
    type: NotificationType,
    suggestedChannels: NotificationChannel[],
    preferences: UserNotificationPreferences,
  ): NotificationChannel[] {
    const typeKey = type.toLowerCase();
    const typePreferences =
      preferences.preferences[typeKey as keyof typeof preferences.preferences];

    if (!typePreferences) {
      return suggestedChannels;
    }

    const enabledChannels: NotificationChannel[] = [];

    if (
      preferences.preferences.email?.enabled &&
      suggestedChannels.includes(NotificationChannel.EMAIL)
    ) {
      enabledChannels.push(NotificationChannel.EMAIL);
    }

    if (
      preferences.preferences.push?.enabled &&
      suggestedChannels.includes(NotificationChannel.PUSH)
    ) {
      enabledChannels.push(NotificationChannel.PUSH);
    }

    if (
      preferences.preferences.inApp?.enabled &&
      suggestedChannels.includes(NotificationChannel.WEBSOCKET)
    ) {
      enabledChannels.push(NotificationChannel.WEBSOCKET);
    }

    return enabledChannels.length > 0 ? enabledChannels : suggestedChannels;
  }

  private async getRecipientIdentifier(
    userId: string,
    channel: NotificationChannel,
  ): Promise<string> {
    switch (channel) {
      case NotificationChannel.EMAIL:
        const user = await this.userRepository.findOne({
          where: { id: userId },
          select: ['id', 'email'],
        });
        if (!user || !user.email) {
          this.logger.warn(`User ${userId} not found or has no email address`);
          throw new Error(`User ${userId} not found or has no email address`);
        }
        return user.email;

      case NotificationChannel.SMS:
        const userForSms = await this.userRepository.findOne({
          where: { id: userId },
          select: ['id', 'phoneNumber'],
        });
        if (!userForSms || !userForSms.phoneNumber) {
          this.logger.warn(`User ${userId} not found or has no phone number`);
          throw new Error(`User ${userId} not found or has no phone number`);
        }
        return userForSms.phoneNumber;

      case NotificationChannel.WEBSOCKET:
      case NotificationChannel.PUSH:
        // For WebSocket and Push, we can use userId directly
        return userId;

      default:
        return userId;
    }
  }

  private async getOrCreatePreferences(
    userId: string,
  ): Promise<UserNotificationPreferences> {
    let preferences = await this.userNotificationPreferencesRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      preferences = this.userNotificationPreferencesRepository.create({
        userId,
        preferences: {
          email: { enabled: true, types: [], frequency: 'realtime' },
          push: { enabled: true, types: [] },
          sms: { enabled: false, types: [], phoneNumber: null },
          inApp: { enabled: true, markAsRead: false },
        },
      });
      await this.userNotificationPreferencesRepository.save(preferences);
    }

    return preferences;
  }

  async scheduleNotification(config: {
    userId: string;
    type: NotificationType;
    scheduleAt: Date;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const notification = this.notificationRepository.create({
      recipient: config.userId,
      type: config.type,
      metadata: config.metadata,
      status: NotificationStatus.SCHEDULED,
      scheduledAt: config.scheduleAt,
    });

    await this.notificationRepository.save(notification);

    // Schedule using BullMQ
    await this.notificationQueueService.scheduleNotificationAt(
      {
        recipient: config.userId,
        channel: NotificationChannel.EMAIL, // Default channel, can be made configurable
        title: 'Scheduled Notification',
        message: 'You have a scheduled notification',
        type: config.type,
        metadata: config.metadata,
        notificationId: notification.id,
      },
      config.scheduleAt,
    );
  }
}
