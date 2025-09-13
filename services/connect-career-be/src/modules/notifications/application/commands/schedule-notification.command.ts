import { IsDate, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { SendNotificationCommand } from './send-notification.command';

export class ScheduleNotificationCommand extends SendNotificationCommand {
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  readonly sendAt: Date;
}