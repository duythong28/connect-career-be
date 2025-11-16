import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserWallet } from './user-wallet.entity';

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  APPLE_PAY = 'apple_pay',
  GOOGLE_PAY = 'google_pay',
  PAYPAL = 'paypal',
  MOMO = 'momo',
  ZALOPAY = 'zalopay',
  VNPAY = 'vnpay',
  BANK_TRANSFER = 'bank_transfer',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentType {
  TOP_UP = 'top_up',
  REFUND = 'refund',
  ADJUSTMENT = 'adjustment',
}

@Entity('payment_transactions')
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserWallet, { nullable: false })
  @JoinColumn({ name: 'walletId' })
  wallet: UserWallet;

  @Column('uuid')
  walletId: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'varchar' })
  provider: string;

  @Column({ type: 'varchar' })
  providerPaymentId: string;

  @Column({ type: 'varchar', nullable: true })
  providerTransactionId?: string;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  paymentMethod: PaymentMethod;

  @Column('uuid', { nullable: true })
  paymentMethodId?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({
    type: 'enum',
    enum: PaymentType,
  })
  type: PaymentType;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  providerResponse?: any;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  failedAt?: Date;

  @Column({ type: 'text', nullable: true })
  failureReason?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
