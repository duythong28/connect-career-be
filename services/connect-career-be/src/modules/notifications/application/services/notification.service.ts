import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import * as notificationRepository from '../../domain/repositories/notification.repository';
import {
  NotificationEntity,
  NotificationStatus,
} from '../../domain/entities/notification.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserNotificationPreferences } from '../../domain/entities/user-notification-preferences.entity';
import { PushNotificationToken } from '../../domain/entities/push-notification-token.entity';

export interface GetNotificationsQuery {
  status?: NotificationStatus;
  type?: string;
  limit?: number;
  page?: number;
}

@Injectable()
export class NotificationService {
  constructor(
    @Inject(notificationRepository.NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: notificationRepository.INotificationRepository,
    @InjectRepository(UserNotificationPreferences)
    private readonly preferencesRepository: Repository<UserNotificationPreferences>,
    @InjectRepository(PushNotificationToken)
    private readonly pushTokenRepository: Repository<PushNotificationToken>,
  ) {}

  async getUserNotifications(userId: string, query: GetNotificationsQuery) {
    const { notifications, total } =
      await this.notificationRepository.findByRecipient(userId, {
        status: query.status,
        type: query.type,
        limit: query.limit || 20,
        offset: query.page || 0,
      });

    return {
      notifications,
      pagination: {
        total,
        limit: query.limit || 20,
        offset: query.page || 0,
        hasMore: (query.page || 0) + (query.limit || 20) < total,
      },
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.notificationRepository.markAsRead(
      notificationId,
      userId,
    );
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    return notification;
  }

  async markAllAsRead(userId: string) {
    const count = await this.notificationRepository.markAllAsRead(userId);
    return { count, message: `Marked ${count} notifications as read` };
  }

  async getUnreadCount(userId: string) {
    const count = await this.notificationRepository.getUnreadCount(userId);
    return { count };
  }

  async getOrCreatePreferences(
    userId: string,
  ): Promise<UserNotificationPreferences> {
    let preferences = await this.preferencesRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      preferences = this.preferencesRepository.create({
        userId,
        preferences: {
          email: {
            enabled: true,
            types: ['job_recommendation'], // Default: job alerts enabled
            frequency: 'realtime',
          },
          push: {
            enabled: true,
            types: ['job_recommendation'], // Default: job alerts enabled
          },
          sms: {
            enabled: false,
            types: [],
            phoneNumber: null,
          },
          inApp: {
            enabled: true,
            markAsRead: false,
          },
        },
      });
      await this.preferencesRepository.save(preferences);
    }

    return preferences;
  }

  async updatePreferences(
    userId: string,
    preferences: Partial<UserNotificationPreferences['preferences']>,
  ) {
    const existing = await this.getOrCreatePreferences(userId);
    existing.preferences = {
      ...existing.preferences,
      ...preferences,
    };
    return this.preferencesRepository.save(existing);
  }

  async registerPushToken(
    userId: string,
    token: string,
    platform: 'fcm' | 'apns' | 'web',
    deviceId?: string,
    deviceName?: string,
  ) {
    // Deactivate old tokens for this device
    if (deviceId) {
      await this.pushTokenRepository.update(
        { userId, deviceId, isActive: true },
        { isActive: false },
      );
    }

    // Create or update token
    const existing = await this.pushTokenRepository.findOne({
      where: { userId, token, isActive: true },
    });

    if (existing) {
      existing.deviceId = deviceId;
      existing.deviceName = deviceName;
      return this.pushTokenRepository.save(existing);
    }

    const pushToken = this.pushTokenRepository.create({
      userId,
      token,
      platform,
      deviceId,
      deviceName,
      isActive: true,
    });

    return this.pushTokenRepository.save(pushToken);
  }

  async getPushTokens(userId: string): Promise<PushNotificationToken[]> {
    return this.pushTokenRepository.find({
      where: { userId, isActive: true },
    });
  }
}
