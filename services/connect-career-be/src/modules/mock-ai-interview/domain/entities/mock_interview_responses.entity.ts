import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import * as interviewConfigurationVo from '../value-objects/interview-configuration.vo';
import { MockInterviewSession } from './mock_interview_sessions.entity';

@Entity('mock_interview_responses')
export class InterviewResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MockInterviewSession, (session) => session.responses)
  @JoinColumn({ name: 'sessionId' })
  session: MockInterviewSession;

  @Column('uuid')
  @Index()
  sessionId: string;

  @Column('uuid')
  questionId: string;

  @Column({ type: 'text', nullable: true })
  textResponse?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  audioUrl?: string;

  @Column({ type: 'int', nullable: true })
  duration?: number; // seconds

  @Column({ type: 'jsonb', nullable: true })
  sentiment?: interviewConfigurationVo.SentimentAnalysis;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
