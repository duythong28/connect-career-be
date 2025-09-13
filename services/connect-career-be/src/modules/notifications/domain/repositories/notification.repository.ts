import { NotificationEntity } from '../entities/notification.entity';

export const NOTIFICATION_REPOSITORY = 'NOTIFICATION_REPOSITORY';

export interface INotificationRepository {
  create(notification: Partial<NotificationEntity>): Promise<NotificationEntity>;
  save(notification: NotificationEntity): Promise<void>;
  findById(id: string): Promise<NotificationEntity | null>;
  findAll(): Promise<NotificationEntity[]>;
  deleteById(id: string): Promise<void>;
}