import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './api/notification.controller';
import { SendNotificationHandler } from './application/handlers/send-notification.handler';
import { ScheduleNotificationHandler } from './application/handlers/schedule-notification.handler';
import { NOTIFICATION_REPOSITORY } from './domain/repositories/notification.repository';
import { SmtpProvider } from './infrastructure/providers/smtp/smtp.provider';
import { WebSocketProvider } from './infrastructure/providers/websocket/websocket.provider';
import { ProviderFactory } from './infrastructure/providers/common/provider.factory';
import { NotificationEntity } from './domain/entities/notification.entity';
import { NotificationTypeOrmRepository } from './infrastructure/repositories/notification.typeorm.repository';
import { SmsProvider } from './infrastructure/providers/sms/sms.provider';

const Handlers = [SendNotificationHandler, ScheduleNotificationHandler];

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([NotificationEntity])],
  controllers: [NotificationsController],
  providers: [
    ...Handlers,
    {
      provide: NOTIFICATION_REPOSITORY,
      useClass: NotificationTypeOrmRepository,
    },
    {
      provide: 'SmtpProvider',
      useClass: SmtpProvider,
    },
    {
      provide: 'SmsProvider',
      useClass: SmsProvider,
    },
    {
      provide: 'WebSocketProvider',
      useClass: WebSocketProvider,
    },
    ProviderFactory,
  ],
  exports: [...Handlers],
})
export class NotificationsModule {}
