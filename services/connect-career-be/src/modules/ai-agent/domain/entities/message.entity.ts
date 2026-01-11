import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { SessionEntity } from './session.entity';
import { AttachmentEntity } from './attachment.entity';

@Entity('messages')
export class MessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sessionId: string;

  @ManyToOne(() => SessionEntity, (session) => session.messages)
  @JoinColumn({ name: 'sessionId' })
  session: SessionEntity;

  @Column('text')
  content: string;

  @Column({ type: 'enum', enum: ['user', 'assistant', 'system'] })
  role: 'user' | 'assistant' | 'system';

  @OneToMany(() => AttachmentEntity, (attachment) => attachment.message)
  attachments: AttachmentEntity[];

  @Column('jsonb', { nullable: true })
  metadata?: {
    // Intent detection
    intent?: string;
    intentConfidence?: number;
    entities?: Record<string, any>;

    // Agent execution
    agentName?: string;
    agentExecutionId?: string; // LangSmith run ID
    executionTime?: number;
    executionSuccess?: boolean;
    executionResult?: any;
    executionErrors?: any[];

    // Media attachments
    attachments?: Array<{
      type: string;
      sourceType: 'url' | 'base64';
      url?: string;
      content?: string;
      name: string;
      mimeType: string;
    }>;
    mediaResults?: any[];

    // LLM metadata
    model?: string;
    tokensUsed?: number;
    temperature?: number;

    // Custom metadata
    [key: string]: any;
  };

  @CreateDateColumn()
  createdAt: Date;
}
