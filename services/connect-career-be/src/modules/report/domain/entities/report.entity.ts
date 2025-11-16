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
import { User } from 'src/modules/identity/domain/entities/user.entity';

export enum ReportableEntityType {
  USER = 'user',
  ORGANIZATION = 'organization',
  JOB = 'job',
  ORGANIZATION_REVIEW = 'organization_review',
  RECRUITER_FEEDBACK = 'recruiter_feedback',
  APPLICATION = 'application',
  INTERVIEW = 'interview',
  OFFER = 'offer',
  CV = 'cv',
  //   PAYMENT = 'payment',
  //   SUBSCRIPTION = 'subscription',
  //   TRANSACTION = 'transaction',
  //   INVOICE = 'invoice',
  OTHER = 'other',
}

export enum ReportStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
  CLOSED = 'closed',
}

export enum ReportPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

// Report reasons specific to each entity type
export enum UserReportReason {
  INAPPROPRIATE_BEHAVIOR = 'inappropriate_behavior',
  SPAM = 'spam',
  FAKE_ACCOUNT = 'fake_account',
  HARASSMENT = 'harassment',
  IMPERSONATION = 'impersonation',
  FRAUD = 'fraud',
  OTHER = 'other',
}

export enum OrganizationReportReason {
  FAKE_COMPANY = 'fake_company',
  SCAM = 'scam',
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  MISLEADING_INFO = 'misleading_info',
  OTHER = 'other',
}

export enum JobReportReason {
  FAKE_JOB = 'fake_job',
  SCAM = 'scam',
  MISLEADING_DESCRIPTION = 'misleading_description',
  DISCRIMINATORY = 'discriminatory',
  DUPLICATE = 'duplicate',
  EXPIRED = 'expired',
  OTHER = 'other',
}

export enum ReviewReportReason {
  FAKE_REVIEW = 'fake_review',
  SPAM = 'spam',
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  HARASSMENT = 'harassment',
  OTHER = 'other',
}

export enum FeedbackReportReason {
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  SPAM = 'spam',
  HARASSMENT = 'harassment',
  OTHER = 'other',
}

export enum ApplicationReportReason {
  FRAUD = 'fraud',
  MISLEADING_INFO = 'misleading_info',
  OTHER = 'other',
}

export enum InterviewReportReason {
  UNPROFESSIONAL_BEHAVIOR = 'unprofessional_behavior',
  DISCRIMINATION = 'discrimination',
  HARASSMENT = 'harassment',
  OTHER = 'other',
}

export enum OfferReportReason {
  SCAM = 'scam',
  MISLEADING_TERMS = 'misleading_terms',
  FRAUD = 'fraud',
  OTHER = 'other',
}

export enum CVReportReason {
  FAKE_INFO = 'fake_info',
  OTHER = 'other',
}

// export enum PaymentReportReason {
//   UNAUTHORIZED_CHARGE = 'unauthorized_charge',
//   DOUBLE_CHARGED = 'double_charged',
//   REFUND_NOT_PROCESSED = 'refund_not_processed',
//   WRONG_AMOUNT = 'wrong_amount',
//   PAYMENT_FAILED_BUT_CHARGED = 'payment_failed_but_charged',
//   FRAUDULENT_TRANSACTION = 'fraudulent_transaction',
//   SUBSCRIPTION_NOT_ACTIVATED = 'subscription_not_activated',
//   BILLING_ERROR = 'billing_error',
//   OTHER = 'other',
// }

// export enum SubscriptionReportReason {
//   NOT_ACTIVATED = 'not_activated',
//   WRONG_PLAN = 'wrong_plan',
//   AUTO_RENEWAL_ISSUE = 'auto_renewal_issue',
//   CANCELED_BUT_STILL_CHARGED = 'canceled_but_still_charged',
//   FEATURES_NOT_AVAILABLE = 'features_not_available',
//   BILLING_CYCLE_ERROR = 'billing_cycle_error',
//   OTHER = 'other',
// }

// export enum TransactionReportReason {
//   FRAUD = 'fraud',
//   DUPLICATE = 'duplicate',
//   WRONG_AMOUNT = 'wrong_amount',
//   MISSING_TRANSACTION = 'missing_transaction',
//   REFUND_ISSUE = 'refund_issue',
//   OTHER = 'other',
// }

// export enum InvoiceReportReason {
//   INCORRECT_AMOUNT = 'incorrect_amount',
//   DUPLICATE_INVOICE = 'duplicate_invoice',
//   MISSING_INVOICE = 'missing_invoice',
//   WRONG_BILLING_INFO = 'wrong_billing_info',
//   TAX_ERROR = 'tax_error',
//   OTHER = 'other',
// }

@Entity('reports')
@Index(['reporterId'])
@Index(['entityType', 'entityId'])
@Index(['status'])
@Index(['priority'])
@Index(['createdAt'])
@Index(['entityType'])
@Index(['assignedToId'])
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'reporterId' })
  reporter: User;

  @Column('uuid')
  reporterId: string;

  @Column({
    type: 'enum',
    enum: ReportableEntityType,
  })
  entityType: ReportableEntityType;

  @Column('uuid')
  entityId: string;

  @Column('varchar', { length: 200 })
  subject: string;

  @Column('text')
  description: string;

  @Column('varchar', { length: 100 })
  reason: string;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status: ReportStatus;

  @Column({
    type: 'enum',
    enum: ReportPriority,
    default: ReportPriority.MEDIUM,
  })
  priority: ReportPriority;

  @Column('text', { nullable: true })
  adminNotes?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignedToId' })
  assignedTo?: User;

  @Column('uuid', { nullable: true })
  assignedToId?: string;

  @Column('text', { nullable: true })
  resolution?: string;

  @Column('timestamptz', { nullable: true })
  resolvedAt?: Date;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  markAsResolved(resolution: string): void {
    this.status = ReportStatus.RESOLVED;
    this.resolution = resolution;
    this.resolvedAt = new Date();
  }

  assignTo(adminId: string): void {
    this.assignedToId = adminId;
    this.status = ReportStatus.UNDER_REVIEW;
  }

  dismiss(): void {
    this.status = ReportStatus.DISMISSED;
  }

  close(): void {
    this.status = ReportStatus.CLOSED;
  }
}
