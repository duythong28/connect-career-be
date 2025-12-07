import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ScheduleNotificationCommand } from '../commands/schedule-notification.command';
import * as notificationRepository from '../../domain/repositories/notification.repository';
import { NotificationResponseDTO } from '../dtos/notification-response.dto';
import { NotificationStatus } from '../../domain/entities/notification.entity';
import { NotificationQueueService } from 'src/shared/infrastructure/queue/services/notification-queue.service';

@Injectable()
@CommandHandler(ScheduleNotificationCommand)
export class ScheduleNotificationHandler
  implements
    ICommandHandler<ScheduleNotificationCommand, NotificationResponseDTO>
{
  constructor(
    @Inject(notificationRepository.NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: notificationRepository.INotificationRepository,
    private readonly notificationQueueService: NotificationQueueService,
  ) {}

  async execute(
    command: ScheduleNotificationCommand,
  ): Promise<NotificationResponseDTO> {
    const { recipient, title, message, channel, sendAt } = command;

    // Create notification record with SCHEDULED status
    const notification = await this.notificationRepository.create({
      recipient,
      title,
      message,
      channel,
      status: NotificationStatus.SCHEDULED,
      scheduledAt: sendAt,
    });

    // Schedule the notification using BullMQ
    await this.notificationQueueService.scheduleNotificationAt(
      {
        recipient,
        channel,
        title,
        message,
        notificationId: notification.id,
      },
      sendAt,
    );

    return new NotificationResponseDTO(notification);
  }
}