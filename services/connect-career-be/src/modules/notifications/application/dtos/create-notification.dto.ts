import { NotificationChannel } from '../../domain/entities/notification.entity';

export class CreateNotificationDTO {
  title: string;
  message: string;
  recipient: string;
  channel: NotificationChannel;
  scheduledTime?: Date;
}
