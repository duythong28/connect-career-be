import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from 'src/modules/identity/domain/entities';
import { Job } from 'src/modules/jobs/domain/entities/job.entity';

export enum JobInteractionType {
  VIEW = 'view',
  CLICK = 'click',
  SAVE = 'save',
  FAVORITE = 'favorite',
  APPLY = 'apply',
}

@Entity('job_interactions')
@Index(['userId', 'jobId', 'type'])  // Use property names in index
@Index(['userId', 'createdAt'])      // Additional index
export class JobInteraction {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column('uuid', { name: 'userId' })  // Explicit snake_case column name
  @Index()
  userId: string;

  @Column('uuid', { name: 'jobId' })  // Explicit snake_case column name
  @Index()
  jobId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Job, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job: Job;

  @Column({
    type: 'enum',
    enum: JobInteractionType,
  })
  type: JobInteractionType;

  @Column({ type: 'real', default: 1 })
  weight: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })  // Explicit snake_case
  @Index()
  createdAt: Date;
}