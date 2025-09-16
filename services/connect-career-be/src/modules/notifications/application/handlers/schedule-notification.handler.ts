import { Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ScheduleNotificationCommand } from '../commands/schedule-notification.command';
import * as notificationRepository from '../../domain/repositories/notification.repository';
import { NotificationResponseDTO } from '../dtos/notification-response.dto';
import { NotificationStatus } from '../../domain/entities/notification.entity';

@Injectable()
@CommandHandler(ScheduleNotificationCommand)
export class ScheduleNotificationHandler
  implements
    ICommandHandler<ScheduleNotificationCommand, NotificationResponseDTO>
{
  constructor(
    @Inject(notificationRepository.NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: notificationRepository.INotificationRepository,
  ) {}

  async execute(
    command: ScheduleNotificationCommand,
  ): Promise<NotificationResponseDTO> {
    const { recipient, title, message, channel, sendAt } = command;

    const notification = await this.notificationRepository.create({
      recipient,
      title,
      message,
      channel,
      status: NotificationStatus.SCHEDULED,
      scheduledAt: sendAt,
    });

    return new NotificationResponseDTO(notification);
  }
}
