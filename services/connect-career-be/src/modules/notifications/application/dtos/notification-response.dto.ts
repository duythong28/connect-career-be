import { ApiProperty } from '@nestjs/swagger';
import {
  NotificationEntity,
  NotificationStatus,
} from '../../domain/entities/notification.entity';

export class NotificationResponseDTO {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: NotificationStatus })
  status: NotificationStatus;

  @ApiProperty()
  message: string;

  @ApiProperty()
  timestamp: Date;

  constructor(notification: NotificationEntity) {
    this.id = notification.id;
    this.status = notification.status;
    this.message = `Notification has been ${notification.status}.`;
    this.timestamp = new Date();
  }
}