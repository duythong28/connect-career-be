import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Industry } from './industry.entity';
import { WorkExperience } from './work-experience.entity';
import { Education } from './education.entity';
import { User } from 'src/modules/identity/domain/entities';
import { Project } from './project.entity';
import { Award } from './award.entity';
import { Certification } from './certification.entity';
import { Publication } from './publication.entity';
export enum ProfileCompletionStatus {
  INCOMPLETE = 'incomplete',
  BASIC = 'basic',
  INTERMEDIATE = 'intermediate',
  COMPLETE = 'complete',
  VERIFIED = 'verified',
}

@Entity('candidate_profiles')
export class CandidateProfile {
  @OneToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  userId: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: true })
  email?: string;

  @Column({ type: 'text', nullable: true })
  phone?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ type: 'varchar', nullable: true })
  city?: string;

  @Column({ type: 'varchar', nullable: true })
  country?: string;

  @Column({ type: 'jsonb', nullable: true })
  socialLinks?: {
    portfolio?: string;
    linkedin?: string;
    github?: string;
    others?: { name: string; url: string }[];
  };

  @Column({
    type: 'enum',
    enum: ProfileCompletionStatus,
    default: ProfileCompletionStatus.INCOMPLETE,
  })
  completionStatus: ProfileCompletionStatus;

  @ManyToOne(() => Industry, { nullable: true })
  @JoinColumn({ name: 'primaryIndustryId' })
  primaryIndustry?: Industry;

  @Column('uuid', { nullable: true })
  primaryIndustryId?: string;

  @Column({ type: 'integer', default: 0 })
  completionPercentage: number;

  @Column('text', { array: true, default: [] })
  skills: string[];

  @Column('text', { array: true, default: [] })
  languages: string[];

  @OneToMany(() => WorkExperience, (exp) => exp.candidateProfile, {
    cascade: true,
  })
  workExperiences: WorkExperience[];

  @OneToMany(() => Education, (edu) => edu.candidateProfile, { cascade: true })
  educations: Education[];

  @OneToMany(() => Project, (project) => project.candidateProfile, {
    cascade: true,
  })
  projects: Project[];

  @OneToMany(() => Certification, (cert) => cert.candidateProfile, {
    cascade: true,
  })
  certifications: Certification[];

  @OneToMany(() => Award, (award) => award.candidateProfile, { cascade: true })
  awards: Award[];

  @OneToMany(() => Publication, (pub) => pub.candidateProfile, {
    cascade: true,
  })
  publications: Publication[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  get isComplete(): boolean {
    return (
      this.completionStatus === ProfileCompletionStatus.COMPLETE ||
      this.completionStatus === ProfileCompletionStatus.VERIFIED
    );
  }

  calculateCompletionPercentage(): number {
    const fields = [
      this.email,
      this.phone,
      this.address,
      this.skills?.length > 0,
      this.workExperiences?.length > 0,
      this.educations?.length > 0,
    ];

    const completedFields = fields.filter(Boolean).length;
    this.completionPercentage = Math.round(
      (completedFields / fields.length) * 100,
    );

    if (this.completionPercentage >= 90) {
      this.completionStatus = ProfileCompletionStatus.COMPLETE;
    } else if (this.completionPercentage >= 70) {
      this.completionStatus = ProfileCompletionStatus.INTERMEDIATE;
    } else if (this.completionPercentage >= 40) {
      this.completionStatus = ProfileCompletionStatus.BASIC;
    }

    return this.completionPercentage;
  }
}
