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
import { Application } from 'src/modules/applications/domain/entities/application.entity';
import { Interview } from 'src/modules/applications/domain/entities/interview.entity';

export enum RecruiterFeedbackType {
  APPLICATION_PROCESS = 'application_process',
  INTERVIEW_EXPERIENCE = 'interview_experience',
  COMMUNICATION = 'communication',
  GENERAL = 'general',
}

@Entity('recruiter_feedbacks')
@Index(['recruiterUserId', 'candidateId']) // Composite index - keep this
export class RecruiterFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  candidateId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'candidateId' })
  candidate: User;

  @Column('uuid')
  recruiterUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'recruiterUserId' })
  recruiterUser: User;

  @Column('uuid', { nullable: true })
  applicationId?: string;

  @ManyToOne(() => Application, { nullable: true })
  @JoinColumn({ name: 'applicationId' })
  application?: Application;

  @Column('uuid', { nullable: true })
  @Index()
  interviewId?: string;

  @ManyToOne(() => Interview, { nullable: true })
  @JoinColumn({ name: 'interviewId' })
  interview?: Interview;

  @Column({
    type: 'enum',
    enum: RecruiterFeedbackType,
    default: RecruiterFeedbackType.GENERAL,
  })
  feedbackType: RecruiterFeedbackType;

  @Column({ type: 'int', nullable: true })
  rating?: number;

  @Column({ type: 'text' })
  feedback: string;

  @Column({ type: 'boolean', nullable: true })
  isPositive?: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
