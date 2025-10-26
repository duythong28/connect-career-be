import {
  Column,
  Entity as TypeOrmEntity,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import {
  ActionItem,
  FeedbackType,
} from '../value-objects/interview-configuration.vo';
import { MockInterviewSession } from './mock_interview_sessions.entity';

@TypeOrmEntity('mock_interview_feedback')
export class InterviewFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  type: FeedbackType;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category?: string;

  @Column({ type: 'jsonb', nullable: true })
  actionItems?: ActionItem[];

  @Column({ type: 'timestamp' })
  generatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => MockInterviewSession, (session) => session.feedback)
  @JoinColumn({ name: 'sessionId' })
  session: MockInterviewSession;

  @Column('uuid')
  @Index()
  sessionId: string;
}
