import { NotificationEntity, NotificationStatus } from '../entities/notification.entity';

export const NOTIFICATION_REPOSITORY = 'NOTIFICATION_REPOSITORY';

export interface INotificationRepository {
  create(notification: Partial<NotificationEntity>): Promise<NotificationEntity>;
  save(notification: NotificationEntity): Promise<void>;
  findById(id: string): Promise<NotificationEntity | null>;
  findAll(): Promise<NotificationEntity[]>;
  deleteById(id: string): Promise<void>;
  findByRecipient(
    recipientId: string,
    options?: {
      status?: NotificationStatus;
      limit?: number;
      offset?: number;
      type?: string;
    },
  ): Promise<{ notifications: NotificationEntity[]; total: number }>;
  
  markAsRead(id: string, recipientId: string): Promise<NotificationEntity | null>;
  markAllAsRead(recipientId: string): Promise<number>;
  getUnreadCount(recipientId: string): Promise<number>;
  findByRecipientAndStatus(
    recipientId: string,
    status: NotificationStatus,
  ): Promise<NotificationEntity[]>;
}