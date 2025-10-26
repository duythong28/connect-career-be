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
import { MockInterviewSession } from './mock_interview_sessions.entity';

@TypeOrmEntity('mock_interview_questions')
export class InterviewQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MockInterviewSession, (session) => session.questions)
  @JoinColumn({ name: 'sessionId' })
  session: MockInterviewSession;

  @Column('uuid')
  @Index()
  sessionId: string;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'varchar', length: 50 })
  type: interviewConfigurationVo.QuestionType;

  @Column({ type: 'varchar', length: 50 })
  persona: string;

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
