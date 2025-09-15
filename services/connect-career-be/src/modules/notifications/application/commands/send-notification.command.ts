import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { NotificationChannel } from '../../domain/entities/notification.entity';

export class SendNotificationCommand {
  @IsEnum(NotificationChannel)
  @IsNotEmpty()
  readonly channel: NotificationChannel;

  @IsString()
  @IsNotEmpty()
  readonly recipient: string;

  @IsString()
  @IsNotEmpty()
  readonly title: string;

  @IsString()
  @IsNotEmpty()
  readonly message: string;
}
