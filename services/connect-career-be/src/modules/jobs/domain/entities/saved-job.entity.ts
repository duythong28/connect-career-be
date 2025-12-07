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
import { Job } from './job.entity';
import { User } from 'src/modules/identity/domain/entities';

@Entity('saved_jobs')
@Index(['userId', 'jobId'], { unique: true })
@Index(['userId', 'savedAt'])
export class SavedJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  userId: string;

  @Column('uuid')
  @Index()
  jobId: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Job, { eager: true })
  @JoinColumn({ name: 'jobId' })
  job: Job;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'varchar', nullable: true })
  folderName?: string;

  @CreateDateColumn()
  @Index()
  savedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
