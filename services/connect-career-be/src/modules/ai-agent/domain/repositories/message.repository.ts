import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MessageEntity } from '../entities/message.entity';

export interface IMessageRepository {
  create(message: Partial<MessageEntity>): Promise<MessageEntity>;
  findById(id: string): Promise<MessageEntity | null>;
  findBySessionId(sessionId: string): Promise<MessageEntity[]>;
  findBySessionIdWithLimit(
    sessionId: string,
    limit: number,
  ): Promise<MessageEntity[]>;
  findByUserId(userId: string, limit?: number): Promise<MessageEntity[]>;
  delete(id: string): Promise<void>;
}

@Injectable()
export class MessageRepository implements IMessageRepository {
  constructor(
    @InjectRepository(MessageEntity)
    private readonly repository: Repository<MessageEntity>,
  ) {}

  async create(message: Partial<MessageEntity>): Promise<MessageEntity> {
    const entity = this.repository.create(message);
    return await this.repository.save(entity);
  }

  async findById(id: string): Promise<MessageEntity | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['session'],
    });
  }

  async findBySessionId(sessionId: string): Promise<MessageEntity[]> {
    return await this.repository.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });
  }

  async findBySessionIdWithLimit(
    sessionId: string,
    limit: number,
  ): Promise<MessageEntity[]> {
    return await this.repository.find({
      where: { sessionId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findByUserId(
    userId: string,
    limit: number = 100,
  ): Promise<MessageEntity[]> {
    return await this.repository
      .createQueryBuilder('message')
      .innerJoin('message.session', 'session')
      .where('session.userId = :userId', { userId })
      .orderBy('message.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
