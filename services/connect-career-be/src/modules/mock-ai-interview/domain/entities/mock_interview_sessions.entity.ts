import {
  Column,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  Entity as TypeOrmEntity,
} from 'typeorm';
import * as interviewConfigurationVo from '../value-objects/interview-configuration.vo';
import { InterviewQuestion } from './mock_interview_questions.entity';
import { InterviewResponse } from './mock_interview_responses.entity';
import { InterviewScore } from './mock_interview_scores.entity';
import { InterviewFeedback } from './mock_interview_feedback.entity';

@TypeOrmEntity('mock_interview_sessions')
@Index(['candidateId'])
@Index(['interviewerAgentId'])
export class AIMockInterview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  candidateId: string;

  @Column('uuid', { nullable: true })
  interviewerAgentId: string;

  @Column({ type: 'text' })
  customPrompt: string;

  @Column({ type: 'text', nullable: true })
  jobDescription?: string;

  @Column({
    type: 'enum',
    enum: interviewConfigurationVo.InterviewSessionStatus,
    default: interviewConfigurationVo.InterviewSessionStatus.CREATED,
  })
  status: interviewConfigurationVo.InterviewSessionStatus;

  @Column({ type: 'jsonb' })
  configuration: interviewConfigurationVo.InterviewConfiguration;

  @Column({ type: 'jsonb', nullable: true })
  results?: interviewConfigurationVo.InterviewResults;

  @Column({ type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @OneToMany(() => InterviewQuestion, (question) => question.session)
  questions: InterviewQuestion[];

  @OneToMany(() => InterviewResponse, (response) => response.session)
  responses: InterviewResponse[];

  @OneToMany(() => InterviewScore, (score) => score.session)
  scores: InterviewScore[];

  @OneToMany(() => InterviewFeedback, (feedback) => feedback.session)
  feedback: InterviewFeedback[];
}
