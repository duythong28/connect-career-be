import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CandidateProfile } from './candidate-profile.entity';

export enum ProjectStatus {
  COMPLETED = 'completed',
  IN_PROGRESS = 'in_progress',
  ON_HOLD = 'on_hold',
  CANCELLED = 'cancelled',
}

@Entity('projects')
@Index(['candidateProfileId'])
@Index(['startDate'])
@Index(['status'])
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CandidateProfile, (profile) => profile.projects, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'candidateProfileId' })
  candidateProfile: CandidateProfile;

  @Column('uuid')
  candidateProfileId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.COMPLETED,
  })
  status: ProjectStatus;

  @Column({ type: 'date', nullable: true })
  startDate?: Date;

  @Column({ type: 'date', nullable: true })
  endDate?: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  projectUrl?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  repositoryUrl?: string;

  @Column('text', { array: true, default: [] })
  technologies: string[];

  @Column('text', { array: true, default: [] })
  features: string[];

  @Column({ type: 'varchar', length: 255, nullable: true })
  role?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  teamSize?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
