import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AgentExecutionEntity } from '../entities/agent-execution.entity';

export interface IAgentExecutionRepository {
  create(execution: Partial<AgentExecutionEntity>): Promise<AgentExecutionEntity>;
  findById(id: string): Promise<AgentExecutionEntity | null>;
  findBySessionId(sessionId: string): Promise<AgentExecutionEntity[]>;
  findByUserId(userId: string, limit?: number): Promise<AgentExecutionEntity[]>;
  findByAgent(agentName: string, limit?: number): Promise<AgentExecutionEntity[]>;
}

@Injectable()
export class AgentExecutionRepository implements IAgentExecutionRepository {
  constructor(
    @InjectRepository(AgentExecutionEntity)
    private readonly repository: Repository<AgentExecutionEntity>,
  ) {}

  async create(execution: Partial<AgentExecutionEntity>): Promise<AgentExecutionEntity> {
    const entity = this.repository.create(execution);
    return await this.repository.save(entity);
  }

  async findById(id: string): Promise<AgentExecutionEntity | null> {
    return await this.repository.findOne({ where: { id } });
  }

  async findBySessionId(sessionId: string): Promise<AgentExecutionEntity[]> {
    return await this.repository.find({
      where: { sessionId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByUserId(userId: string, limit: number = 50): Promise<AgentExecutionEntity[]> {
    return await this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findByAgent(agentName: string, limit: number = 50): Promise<AgentExecutionEntity[]> {
    return await this.repository.find({
      where: { agentName },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}