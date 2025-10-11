// services/connect-career-be/src/modules/subscription/domain/entities/subscription.entity.ts
import { User } from 'src/modules/identity/domain/entities';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { Product } from './product.entity';
import { Price } from './price.entity';

export enum PlanSubject {
  USER = 'user',
  ORG = 'org',
}

export enum SubscriptionStatus {
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  INCOMPLETE = 'incomplete',
}

export enum Provider {
  EWALLET = 'ewallet',
  BANK_TRANSFER = 'bank_transfer',
  CARD = 'card',
  CRYPTOCURRENCY = 'cryptocurrency',
}

@Entity('subscription')
@Index(['subjectType', 'subjectId'])
@Unique(['subjectType', 'subjectId'])
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: PlanSubject,
  })
  subjectType: PlanSubject;

  @Column('uuid')
  subjectId: string;

  @Column('uuid')
  productId: string;

  @Column('uuid')
  priceId: string;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
  })
  status: SubscriptionStatus;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  startAt: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  currentPeriodStart: Date;

  @Column({ type: 'timestamptz' })
  currentPeriodEnd: Date;

  @Column({ type: 'boolean', default: false })
  cancelAtPeriodEnd: boolean;

  @Column({
    type: 'enum',
    enum: Provider,
  })
  provider: Provider;

  @Column({ type: 'text', nullable: true })
  providerSubscriptionId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @ManyToOne(() => Price)
  @JoinColumn({ name: 'priceId' })
  price: Price;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'subjectId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  get isActive(): boolean {
    return (
      this.status === SubscriptionStatus.ACTIVE ||
      this.status === SubscriptionStatus.TRIALING
    );
  }

  get isTrial(): boolean {
    return this.status === SubscriptionStatus.TRIALING;
  }
}
