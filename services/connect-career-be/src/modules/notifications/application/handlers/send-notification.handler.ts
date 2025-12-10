import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SendNotificationCommand } from '../commands/send-notification.command';
import { NotificationResponseDTO } from '../dtos/notification-response.dto';
import * as notificationRepository from '../../domain/repositories/notification.repository';
import { NotificationStatus } from '../../domain/entities/notification.entity';
import { NotificationQueueService } from 'src/shared/infrastructure/queue/services/notification-queue.service';

@Injectable()
@CommandHandler(SendNotificationCommand)
export class SendNotificationHandler
  implements ICommandHandler<SendNotificationCommand>
{
  constructor(
    @Inject(notificationRepository.NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: notificationRepository.INotificationRepository,
    private readonly notificationQueueService: NotificationQueueService,
  ) {}

  async execute(
    command: SendNotificationCommand,
  ): Promise<NotificationResponseDTO> {
    const { recipient, message, channel, title } = command;

    // Create notification record first
    const notification = await this.notificationRepository.create({
      recipient,
      title,
      message,
      channel,
      status: NotificationStatus.PENDING,
    });

    // Queue the notification for async processing
    await this.notificationQueueService.queueNotification({
      recipient,
      channel,
      title,
      message,
      notificationId: notification.id,
    });

    return new NotificationResponseDTO(notification);
  }
}
