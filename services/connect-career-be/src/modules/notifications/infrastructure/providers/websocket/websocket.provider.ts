import { Injectable } from '@nestjs/common';
import { INotificationProvider } from '../common/notification-provider.interface';
import { NotificationGateway } from './websocket.gateway';

@Injectable()
export class WebSocketProvider implements INotificationProvider {
  constructor(private readonly gateway: NotificationGateway) {}

  async send(recipient: string, title: string, message: string, metadata?: any): Promise<void> {
    this.gateway.sendNotification(recipient, {
      title,
      message,
      metadata,
      timestamp: new Date(),
    });
  }
}