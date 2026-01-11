import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import {
  NotificationEntity,
  NotificationStatus,
  NotificationChannel,
} from '../../domain/entities/notification.entity';
import { INotificationRepository } from '../../domain/repositories/notification.repository';

@Injectable()
export class NotificationTypeOrmRepository implements INotificationRepository {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly ormRepository: Repository<NotificationEntity>,
  ) {}

  async create(
    notificationData: Partial<NotificationEntity>,
  ): Promise<NotificationEntity> {
    const notification = this.ormRepository.create(notificationData);
    return this.ormRepository.save(notification);
  }

  async save(notification: NotificationEntity): Promise<void> {
    await this.ormRepository.save(notification);
  }

  async findById(id: string): Promise<NotificationEntity | null> {
    return this.ormRepository.findOneBy({ id });
  }

  async findAll(): Promise<NotificationEntity[]> {
    return this.ormRepository.find();
  }

  async deleteById(id: string): Promise<void> {
    await this.ormRepository.delete(id);
  }

  async findByRecipient(
    recipientId: string,
    options?: {
      status?: NotificationStatus;
      limit?: number;
      offset?: number;
      type?: string;
    },
  ): Promise<{ notifications: NotificationEntity[]; total: number }> {
    const queryBuilder = this.ormRepository
      .createQueryBuilder('notification')
      .where('notification.recipient = :recipientId', { recipientId })
      .andWhere('notification.channel = :channel', {
        channel: NotificationChannel.WEBSOCKET,
      })
      .orderBy('notification.createdAt', 'DESC');

    if (options?.status) {
      queryBuilder.andWhere('notification.status = :status', {
        status: options.status,
      });
    }

    if (options?.type) {
      queryBuilder.andWhere('notification.type = :type', {
        type: options.type,
      });
    }

    const total = await queryBuilder.getCount();

    if (options?.limit) {
      queryBuilder.limit(options.limit);
    }

    if (options?.offset) {
      queryBuilder.offset(options.offset);
    }

    const notifications = await queryBuilder.getMany();

    return { notifications, total };
  }

  async markAsRead(
    id: string,
    recipientId: string,
  ): Promise<NotificationEntity | null> {
    const notification = await this.ormRepository.findOne({
      where: {
        id,
        recipient: recipientId,
        channel: NotificationChannel.WEBSOCKET,
      },
    });

    if (!notification) {
      return null;
    }

    if (!notification.readAt) {
      notification.readAt = new Date();
      notification.status = NotificationStatus.READ;
      return this.ormRepository.save(notification);
    }

    return notification;
  }

  async markAllAsRead(recipientId: string): Promise<number> {
    const result = await this.ormRepository
      .createQueryBuilder()
      .update(NotificationEntity)
      .set({
        readAt: () => 'CURRENT_TIMESTAMP',
        status: NotificationStatus.READ,
      })
      .where('recipient = :recipientId', { recipientId })
      .andWhere('readAt IS NULL')
      .andWhere('channel = :channel', {
        channel: NotificationChannel.WEBSOCKET,
      })
      .execute();

    return result.affected || 0;
  }

  async getUnreadCount(recipientId: string): Promise<number> {
    return this.ormRepository.count({
      where: {
        recipient: recipientId,
        channel: NotificationChannel.WEBSOCKET,
        readAt: IsNull(),
        status: NotificationStatus.SENT,
      },
    });
  }

  async findByRecipientAndStatus(
    recipientId: string,
    status: NotificationStatus,
  ): Promise<NotificationEntity[]> {
    return this.ormRepository.find({
      where: {
        recipient: recipientId,
        status,
        channel: NotificationChannel.WEBSOCKET,
      },
      order: { createdAt: 'DESC' },
    });
  }
}
