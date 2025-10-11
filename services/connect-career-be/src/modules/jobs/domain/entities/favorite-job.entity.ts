import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Job } from './job.entity';
import { User } from 'src/modules/identity/domain/entities';

@Entity('favorite_jobs')
@Index(['userId', 'jobId'], { unique: true })
@Index(['userId', 'favoritedAt'])
export class FavoriteJob {
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

  @CreateDateColumn()
  @Index()
  favoritedAt: Date;
}
