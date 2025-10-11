// services/connect-career-be/src/modules/subscription/domain/entities/invoice.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Subscription } from './subscription.entity';
import { Provider } from './subscription.entity';

export enum InvoiceStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  PAID = 'paid',
  VOID = 'void',
  UNCOLLECTIBLE = 'uncollectible',
  REFUNDED = 'refunded',
}

@Entity('invoice')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  subscriptionId: string;

  @Column({
    type: 'enum',
    enum: Provider,
  })
  provider: Provider;

  @Column({ type: 'text', nullable: true })
  providerInvoiceId: string;

  @Column({ type: 'text', default: 'VND' })
  currency: string;

  @Column({ type: 'bigint' })
  amountDue: number;

  @Column({ type: 'bigint', default: 0 })
  amountPaid: number;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
  })
  status: InvoiceStatus;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  issuedAt: Date;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @ManyToOne(() => Subscription, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'subscriptionId' })
  subscription: Subscription;
}
