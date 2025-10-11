// services/connect-career-be/src/modules/subscription/domain/entities/payment-transaction.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Invoice } from './invoice.entity';
import { Provider } from './subscription.entity';

export enum TransactionStatus {
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  PENDING = 'pending',
  REFUNDED = 'refunded',
  PARTIAL_REFUNDED = 'partial_refunded',
}

@Entity('payment_transaction')
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  invoiceId: string;

  @Column({
    type: 'enum',
    enum: Provider,
  })
  provider: Provider;

  @Column({ type: 'text', nullable: true })
  providerPaymentId: string;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
  })
  status: TransactionStatus;

  @Column({ type: 'bigint' })
  amount: number;

  @Column({ type: 'text', default: 'VND' })
  currency: string;

  @Column({ type: 'jsonb', default: {} })
  rawPayload: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Invoice, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;
}
