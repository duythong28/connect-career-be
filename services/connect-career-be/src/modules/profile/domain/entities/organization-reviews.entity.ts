import { User } from 'src/modules/identity/domain/entities';
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
import { Organization } from './organization.entity';
import { Application } from 'src/modules/applications/domain/entities/application.entity';

export enum OvertimePolicySatisfaction {
  SATISFIED = 'satisfied',
  UNSATISFIED = 'unsatisfied',
}

@Entity('organization_reviews')
@Index(['organizationId', 'candidateId'])
export class OrganizationReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  organizationId: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column('uuid')
  @Index()
  candidateId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'candidateId' })
  candidate: User;

  @Column('uuid', { nullable: true })
  @Index()
  applicationId?: string;

  @ManyToOne(() => Application, { nullable: true })
  @JoinColumn({ name: 'applicationId' })
  application?: Application;

  @Column({ type: 'int' })
  overallRating: number;

  @Column({ type: 'varchar', length: 140 })
  summary: string;

  @Column({
    type: 'enum',
    enum: OvertimePolicySatisfaction,
  })
  overtimePolicySatisfaction: OvertimePolicySatisfaction;

  @Column({ type: 'varchar', length: 140, nullable: true })
  overtimePolicyReason?: string;

  @Column({ type: 'text' })
  whatMakesYouLoveWorkingHere: string;

  @Column({ type: 'text' })
  suggestionForImprovement: string;

  @Column({ type: 'jsonb' })
  ratingDetails: {
    salaryBenefits: number;
    trainingLearning: number;
    managementCares: number;
    cultureFun: number;
    officeWorkspace: number;
  };

  @Column({ type: 'boolean' })
  wouldRecommend: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
