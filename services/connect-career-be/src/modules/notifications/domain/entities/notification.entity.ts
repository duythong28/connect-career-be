import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  WEBSOCKET = 'websocket',
  PUSH = 'push',
}

export enum NotificationType {
  // Application related
  APPLICATION_RECEIVED = 'application_received',
  APPLICATION_STATUS_CHANGED = 'application_status_changed',
  APPLICATION_SHORTLISTED = 'application_shortlisted',
  APPLICATION_REJECTED = 'application_rejected',
  APPLICATION_HIRED = 'application_hired',
  APPLICATION_DEADLINE_REMINDER = 'application_deadline_reminder',

  // Interview related
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  INTERVIEW_REMINDER = 'interview_reminder',
  INTERVIEW_CANCELLED = 'interview_cancelled',
  INTERVIEW_RESCHEDULED = 'interview_rescheduled',

  // Offer related
  OFFER_SENT = 'offer_sent',
  OFFER_ACCEPTED = 'offer_accepted',
  OFFER_REJECTED = 'offer_rejected',

  // Communication
  NEW_MESSAGE = 'new_message',
  MENTION = 'mention',

  // Job related
  JOB_RECOMMENDATION = 'job_recommendation',
  JOB_DEADLINE_APPROACHING = 'job_deadline_approaching',

  PROFILE_VIEWED = 'profile_viewed',
  CV_FEEDBACK = 'cv_feedback',

  // System
  USER_REGISTERED = 'user_registered',
  PASSWORD_RESET = 'password_reset',
  EMAIL_VERIFIED = 'email_verified',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  SENT = 'sent',
  FAILED = 'failed',
  READ = 'read',
}

@Entity('notifications')
@Index(['recipient', 'status'])
@Index(['recipient', 'createdAt'])
@Index(['type', 'status'])
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  recipient: string;

  @Column()
  title: string;

  @Column()
  message: string;

  @Column({
    type: 'enum',
    enum: NotificationChannel,
  })
  channel: NotificationChannel;

  @Column('text', { nullable: true })
  htmlContent?: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    nullable: true,
  })
  type?: NotificationType;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.SENT,
  })
  status: NotificationStatus;

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  sentAt?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  readAt?: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
