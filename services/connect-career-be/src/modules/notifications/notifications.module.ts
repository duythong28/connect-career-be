import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import { UserRegisteredHandler } from './application/handlers/user-registered.handler';
import { ApplicationCreatedHandler } from './application/handlers/application-created.handler';
import { ApplicationStatusChangedHandler } from './application/handlers/application-status-changed.handler';
import { InterviewScheduledHandler } from './application/handlers/interview-scheduled.handler';
import { InterviewCancelledHandler } from './application/handlers/interview-cancelled.handler';
import { InterviewRescheduledHandler } from './application/handlers/interview-rescheduled.handler';
import { OfferSentHandler } from './application/handlers/offer-sent.handler';
import { OfferAcceptedHandler } from './application/handlers/offer-accepted.handler';
import { OfferRejectedHandler } from './application/handlers/offer-rejected.handler';
import { NodemailerProvider } from './infrastructure/providers/smtp/nodemailer.provider';
import { NotificationService } from './application/services/notification.service';
import { NotificationTemplateService } from './application/services/notification-template.service';
import { NotificationGateway } from './infrastructure/providers/websocket/websocket.gateway';
import { UserNotificationPreferences } from './domain/entities/user-notification-preferences.entity';
import { PushNotificationToken } from './domain/entities/push-notification-token.entity';
import { NotificationOrchestratorService } from './application/services/notification-orchstrator.service';
import { BullModule } from '@nestjs/bullmq';
import { NotificationProcessor } from 'src/shared/infrastructure/queue/processors/notification.processor';
import { ScheduledNotificationScheduler } from 'src/shared/infrastructure/queue/services/scheduled-notification.scheduler';
import { NotificationQueueService } from 'src/shared/infrastructure/queue/services/notification-queue.service';
import { jwtConfig } from '../identity/infrastructure/config/jwt.config';
import { User } from '../identity/domain/entities';

const Handlers = [
  SendNotificationHandler,
  ScheduleNotificationHandler,
  UserRegisteredHandler,
  ApplicationCreatedHandler,
  ApplicationStatusChangedHandler,
  InterviewScheduledHandler,
  InterviewCancelledHandler,
  InterviewRescheduledHandler,
  OfferSentHandler,
  OfferAcceptedHandler,
  OfferRejectedHandler,
];

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([
      NotificationEntity,
      UserNotificationPreferences,
      PushNotificationToken,
      User,
    ]),
    BullModule.registerQueue({
      name: 'notifications',
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: jwtConfig,
      inject: [ConfigService],
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    ...Handlers,
    NotificationService,
    NotificationOrchestratorService,
    NotificationTemplateService,
    NotificationGateway,
    NotificationProcessor,
    NotificationQueueService,
    ScheduledNotificationScheduler,
    NodemailerProvider,
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
  exports: [
    ...Handlers,
    NotificationService,
    NotificationOrchestratorService,
    NotificationQueueService,
  ],
})
export class NotificationsModule {}
