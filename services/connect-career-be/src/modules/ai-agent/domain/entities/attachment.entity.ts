import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MessageEntity } from './message.entity';

@Entity('attachments')
export class AttachmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  messageId: string;

  @ManyToOne(() => MessageEntity, (message) => message.attachments)
  @JoinColumn({ name: 'messageId' })
  message: MessageEntity;

  @Column()
  type: string; // 'image', 'document', etc.

  @Column()
  name: string;

  @Column()
  mimeType: string;

  @Column()
  url: string; // URL to stored file

  @Column({ nullable: true })
  size?: number;

  @Column('jsonb', { nullable: true })
  processingResult?: {
    extractedText?: string;
    analysis?: any;
    success: boolean;
    error?: string;
  };

  @CreateDateColumn()
  createdAt: Date;
}
