import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import * as interviewConfigurationVo from '../value-objects/interview-configuration.vo';
import { AIMockInterview } from './mock_interview_sessions.entity';

@Entity('mock_interview_responses')
export class InterviewResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AIMockInterview, (session) => session.responses)
  @JoinColumn({ name: 'sessionId' })
  session: AIMockInterview;

  @Column('uuid')
  @Index()
  sessionId: string;

  @Column('uuid', { nullable: true })
  questionId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index()
  callId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index()
  email?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name?: string;

  @Column({ type: 'text', nullable: true })
  textResponse?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  audioUrl?: string;

  @Column({ type: 'int', nullable: true })
  duration?: number; // seconds

  @Column({ type: 'jsonb', nullable: true })
  sentiment?: interviewConfigurationVo.SentimentAnalysis;

  @Column({ type: 'jsonb', nullable: true })
  analytics?: any;

  @Column({ type: 'boolean', default: false })
  isEnded: boolean;

  @Column({ type: 'boolean', default: false })
  isAnalysed: boolean;

  @Column({ type: 'text', nullable: true })
  transcript?: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
