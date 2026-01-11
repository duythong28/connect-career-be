import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SessionEntity } from '../entities/session.entity';

export interface ISessionRepository {
  create(session: Partial<SessionEntity>): Promise<SessionEntity>;
  findById(id: string): Promise<SessionEntity | null>;
  findByUserId(userId: string, limit?: number): Promise<SessionEntity[]>;
  update(id: string, updates: Partial<SessionEntity>): Promise<SessionEntity>;
  delete(id: string): Promise<void>;
}

@Injectable()
export class SessionRepository implements ISessionRepository {
  constructor(
    @InjectRepository(SessionEntity)
    private readonly repository: Repository<SessionEntity>,
  ) {}

  async create(session: Partial<SessionEntity>): Promise<SessionEntity> {
    const entity = this.repository.create(session);
    return await this.repository.save(entity);
  }

  async findById(id: string): Promise<SessionEntity | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['messages'],
    });
  }

  async findByUserId(
    userId: string,
    limit: number = 50,
  ): Promise<SessionEntity[]> {
    return await this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['messages'],
    });
  }

  async update(
    id: string,
    updates: Partial<SessionEntity>,
  ): Promise<SessionEntity> {
    await this.repository.update(id, updates);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Session ${id} not found after update`);
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
