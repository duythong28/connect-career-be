// services/connect-career-be/src/modules/subscription/domain/entities/usage-counter.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { PlanSubject } from './subscription.entity';

export enum FeatureKey {
  // AI Features
  AI_CV_SCORING = 'AI_CV_SCORING',
  AI_CV_IMPROVE = 'AI_CV_IMPROVE',
  AI_MOCK_INTERVIEW_MINUTES = 'AI_MOCK_INTERVIEW_MINUTES',
  AI_JD_GENERATION = 'AI_JD_GENERATION',
  AI_CANDIDATE_RECOMMENDATIONS = 'AI_CANDIDATE_RECOMMENDATIONS',

  // Contact & Communication
  CONTACT_UNLOCK = 'CONTACT_UNLOCK',
  CHAT_THREAD_LIMIT = 'CHAT_THREAD_LIMIT',
  CANDIDATE_SEARCH_VIEWS = 'CANDIDATE_SEARCH_VIEWS',

  // Job Features
  JOB_SAVE_LIMIT = 'JOB_SAVE_LIMIT',
  JOB_POSTINGS = 'JOB_POSTINGS',
  CV_UPLOADS = 'CV_UPLOADS',

  // Premium Features
  PIPELINE_PRO = 'PIPELINE_PRO',
  DASHBOARD_PRO = 'DASHBOARD_PRO',
}

@Entity('usage_counter')
@Index(['subjectType', 'subjectId', 'period'])
@Index(['featureKey', 'period'])
@Unique(['subjectType', 'subjectId', 'featureKey', 'period'])
export class UsageCounter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: PlanSubject,
  })
  subjectType: PlanSubject;

  @Column('uuid')
  subjectId: string;

  @Column({
    type: 'enum',
    enum: FeatureKey,
  })
  featureKey: FeatureKey;

  @Column({ type: 'text' })
  period: string; // yyyymm format (e.g., '202510')

  @Column({ type: 'int', default: 0 })
  used: number;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;

  canUse(limit: number): boolean {
    return this.used < limit;
  }

  remaining(limit: number): number {
    return Math.max(0, limit - this.used);
  }
}
