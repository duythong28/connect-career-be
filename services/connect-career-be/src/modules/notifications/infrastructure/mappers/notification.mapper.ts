import { CreateNotificationDTO } from '../../application/dtos/create-notification.dto';
import { NotificationEntity } from '../../domain/entities/notification.entity';

export class NotificationMapper {
  static toEntity(dto: CreateNotificationDTO): NotificationEntity {
    const notification = new NotificationEntity();
    notification.title = dto.title;
    notification.message = dto.message;
    notification.recipient = dto.recipient;
    notification.channel = dto.channel;
    notification.createdAt = new Date();
    return notification;
  }

  static toDto(entity: NotificationEntity): CreateNotificationDTO {
    return {
      title: entity.title,
      message: entity.message,
      recipient: entity.recipient,
      channel: entity.channel,
    };
  }
}
