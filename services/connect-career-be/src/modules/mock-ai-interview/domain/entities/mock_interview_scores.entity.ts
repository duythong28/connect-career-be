import {
  Entity as TypeOrmEntity,
  PrimaryGeneratedColumn,
  Index,
  Column,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import * as interviewConfigurationVo from '../value-objects/interview-configuration.vo';
import { AIMockInterview } from './mock_interview_sessions.entity';

@TypeOrmEntity('mock_interview_scores')
export class InterviewScore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AIMockInterview, (session) => session.scores)
  @JoinColumn({ name: 'sessionId' })
  session: AIMockInterview;

  @Column('uuid')
  @Index()
  sessionId: string;

  @Column('uuid', { nullable: true })
  questionId?: string;

  @Column({ type: 'varchar', length: 50 })
  dimension: interviewConfigurationVo.ScoringDimension;

  @Column({ type: 'int' })
  score: number;

  @Column({ type: 'text' })
  rationale: string;

  @Column({ type: 'jsonb', nullable: true })
  details?: interviewConfigurationVo.ScoreDetails;
}
