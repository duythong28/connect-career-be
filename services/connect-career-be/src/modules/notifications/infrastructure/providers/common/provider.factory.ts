import { Injectable, Inject } from '@nestjs/common';
import { NotificationChannel } from '../../../domain/entities/notification.entity';
import * as notificationProviderInterface from './notification-provider.interface';

@Injectable()
export class ProviderFactory {
  constructor(
    @Inject('SmtpProvider') private readonly smtpProvider: notificationProviderInterface.INotificationProvider,
    @Inject('SmsProvider') private readonly smsProvider: notificationProviderInterface.INotificationProvider,
    @Inject('WebSocketProvider')
    private readonly webSocketProvider: notificationProviderInterface.INotificationProvider,
  ) {}

  createProvider(channel: NotificationChannel): notificationProviderInterface.INotificationProvider {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return this.smtpProvider;
      case NotificationChannel.SMS:
        return this.smsProvider;
      case NotificationChannel.WEBSOCKET:
        return this.webSocketProvider;
      default:
        throw new Error(`No provider found for channel: ${channel}`);
    }
  }
}