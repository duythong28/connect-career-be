import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConversationEntity } from '../entities/conversation.entity';

export interface IConversationRepository {
  create(conversation: Partial<ConversationEntity>): Promise<ConversationEntity>;
  findBySessionId(sessionId: string): Promise<ConversationEntity[]>;
  findByUserId(userId: string, limit?: number): Promise<ConversationEntity[]>;
  deleteBySessionId(sessionId: string): Promise<void>;
}

@Injectable()
export class ConversationRepository implements IConversationRepository {
  constructor(
    @InjectRepository(ConversationEntity)
    private readonly repository: Repository<ConversationEntity>,
  ) {}

  async create(conversation: Partial<ConversationEntity>): Promise<ConversationEntity> {
    const entity = this.repository.create(conversation);
    return await this.repository.save(entity);
  }

  async findBySessionId(sessionId: string): Promise<ConversationEntity[]> {
    return await this.repository.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });
  }

  async findByUserId(userId: string, limit: number = 100): Promise<ConversationEntity[]> {
    return await this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async deleteBySessionId(sessionId: string): Promise<void> {
    await this.repository.delete({ sessionId });
  }
}