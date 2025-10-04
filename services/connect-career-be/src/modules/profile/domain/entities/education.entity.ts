import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CandidateProfile } from './candidate-profile.entity';

export enum DegreeType {
  HIGH_SCHOOL = 'high_school',
  ASSOCIATE = 'associate',
  BACHELOR = 'bachelor',
  MASTER = 'master',
  DOCTORATE = 'doctorate',
  CERTIFICATE = 'certificate',
  DIPLOMA = 'diploma',
}

@Entity('educations')
export class Education {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CandidateProfile, (profile) => profile.educations)
  @JoinColumn({ name: 'candidateProfileId' })
  candidateProfile: CandidateProfile;

  @Column('uuid')
  candidateProfileId: string;

  @Column({ type: 'varchar' })
  institutionName: string;

  @Column({ type: 'enum', enum: DegreeType })
  degreeType: DegreeType;

  @Column({ type: 'date', nullable: true })
  startDate?: Date;

  @Column({ type: 'date', nullable: true })
  graduationDate?: Date;

  @Column({ type: 'boolean', default: false })
  isCurrent: boolean;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column('text', { array: true, default: [] })
  coursework: string[];

  @Column('text', { array: true, default: [] })
  honors: string[];

  @Column({ type: 'varchar', nullable: true })
  location?: string;

  @Column({ type: 'varchar', nullable: true })
  fieldOfStudy?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
