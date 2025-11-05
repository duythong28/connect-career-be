import {
  Column,
  CreateDateColumn,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Entity as TypeOrmEntity,
  UpdateDateColumn,
} from 'typeorm';
import * as interviewConfigurationVo from '../value-objects/interview-configuration.vo';
import { AIMockInterview } from './mock_interview_sessions.entity';

@TypeOrmEntity('mock_interview_questions')
export class InterviewQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AIMockInterview, (session) => session.questions)
  @JoinColumn({ name: 'sessionId' })
  session: AIMockInterview;

  @Column('uuid')
  @Index()
  sessionId: string;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'int' })
  order: number;

  @Column({ type: 'jsonb', nullable: true })
  context?: interviewConfigurationVo.QuestionContext;

  @Column({ type: 'timestamp' })
  askedAt: Date;

  @Column({ type: 'int', nullable: true })
  timeLimit?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
