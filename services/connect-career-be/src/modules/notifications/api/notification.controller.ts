import { Controller, Post, Body } from '@nestjs/common';
import { SendNotificationCommand } from '../application/commands/send-notification.command';
import { ScheduleNotificationCommand } from '../application/commands/schedule-notification.command';
import { NotificationResponseDTO } from '../application/dtos/notification-response.dto';
import { CommandBus } from '@nestjs/cqrs';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('send')
  async sendNotification(
    @Body() sendNotificationCommand: SendNotificationCommand,
  ): Promise<NotificationResponseDTO> {
    return this.commandBus.execute(sendNotificationCommand);
  }

  @Post('schedule')
  async scheduleNotification(
    @Body() scheduleNotificationCommand: ScheduleNotificationCommand,
  ): Promise<NotificationResponseDTO> {
    return this.commandBus.execute(scheduleNotificationCommand);
  }
}