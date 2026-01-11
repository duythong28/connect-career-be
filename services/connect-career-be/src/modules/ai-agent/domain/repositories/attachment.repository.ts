import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AttachmentEntity } from '../entities/attachment.entity';

export interface IAttachmentRepository {
  create(attachment: Partial<AttachmentEntity>): Promise<AttachmentEntity>;
  findById(id: string): Promise<AttachmentEntity | null>;
  findByMessageId(messageId: string): Promise<AttachmentEntity[]>;
  delete(id: string): Promise<void>;
}

@Injectable()
export class AttachmentRepository implements IAttachmentRepository {
  constructor(
    @InjectRepository(AttachmentEntity)
    private readonly repository: Repository<AttachmentEntity>,
  ) {}

  async create(
    attachment: Partial<AttachmentEntity>,
  ): Promise<AttachmentEntity> {
    const entity = this.repository.create(attachment);
    return await this.repository.save(entity);
  }

  async findById(id: string): Promise<AttachmentEntity | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['message'],
    });
  }

  async findByMessageId(messageId: string): Promise<AttachmentEntity[]> {
    return await this.repository.find({
      where: { messageId },
      order: { createdAt: 'ASC' },
    });
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
