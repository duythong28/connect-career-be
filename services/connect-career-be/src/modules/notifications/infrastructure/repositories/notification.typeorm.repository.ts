import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEntity } from '../../domain/entities/notification.entity';
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
}
