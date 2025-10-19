import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CandidateProfile } from './candidate-profile.entity';
import { Organization } from './organization.entity';

export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  FREELANCE = 'freelance',
  CONTRACT = 'contract',
  SEASONAL = 'seasonal',
  INTERNSHIP = 'internship',
  OTHER = 'other',
}

@Entity('work_experiences')
export class WorkExperience {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CandidateProfile, (profile) => profile.workExperiences, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'candidateProfileId' })
  candidateProfile: CandidateProfile;

  @Column('uuid')
  candidateProfileId: string;

  @Column({ type: 'varchar', length: 255 })
  jobTitle: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column('uuid')
  organizationId: string;

  @Column({
    type: 'enum',
    enum: EmploymentType,
    default: EmploymentType.FULL_TIME,
  })
  employmentType: EmploymentType;

  @Column({ type: 'varchar', nullable: true })
  location?: string;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate?: Date;

  @Column({ type: 'boolean', default: false })
  isCurrent: boolean;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column('text', { array: true, default: [] })
  skills: string[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  get durationInMonths(): number {
    const end = this.isCurrent ? new Date() : this.endDate;
    if (!end) return 0;

    const diffTime = Math.abs(end.getTime() - this.startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
  }
}
