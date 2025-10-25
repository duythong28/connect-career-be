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
import { Application } from './application.entity';
import { User } from 'src/modules/identity/domain/entities';

export enum InterviewType {
  PHONE = 'phone',
  VIDEO = 'video',
  IN_PERSON = 'in-person',
  TECHNICAL = 'technical',
  CULTURAL = 'cultural',
}

export enum InterviewStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  RESCHEDULED = 'rescheduled',
  NO_SHOW = 'no_show',
}

@Entity('interviews')
@Index(['applicationId', 'status'])
@Index(['scheduledDate'])
export class Interview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Application, (application) => application.interviews, {
    eager: true,
  })
  @JoinColumn({ name: 'applicationId' })
  application: Application;

  @Column('uuid')
  @Index()
  applicationId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'interviewerId' })
  interviewer?: User;

  @Column('uuid', { nullable: true })
  interviewerId?: string;

  @Column({ type: 'date' })
  @Index()
  date: Date;

  @Column({
    type: 'enum',
    enum: InterviewType,
  })
  type: InterviewType;

  @Column({
    type: 'enum',
    enum: InterviewStatus,
    default: InterviewStatus.SCHEDULED,
  })
  @Index()
  status: InterviewStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'timestamp' })
  scheduledDate: Date;

  @Column({ type: 'int', nullable: true })
  duration?: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  meetingLink?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  interviewerName?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  interviewerEmail?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  interviewRound?: string;

  @Column({ type: 'jsonb', nullable: true })
  feedback?: {
    templateId?: string;
    templateVersion?: number;

    entries: Array<{
      key: string;
      value: number | boolean | string | string[];
      comment?: string;
    }>;

    computed?: {
      overallScore?: number;
      sectionScores?: Record<string, number>;
    };

    rating?: number;
    strengths?: string[];
    weaknesses?: string[];
    recommendation?:
      | 'strongly_recommend'
      | 'recommend'
      | 'neutral'
      | 'not_recommend';
    comments?: string;
  };

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @Column({ type: 'text', nullable: true })
  cancellationReason?: string;

  @Column({ type: 'boolean', default: false })
  candidateNotified: boolean;

  @Column({ type: 'boolean', default: false })
  interviewerNotified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  reminderSentAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
