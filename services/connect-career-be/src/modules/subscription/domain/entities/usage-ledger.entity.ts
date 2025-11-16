// src/modules/subscription/domain/entities/usage-ledger.entity.ts
import { User } from 'src/modules/identity/domain/entities';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BillableAction } from './billable-action.entity';

@Entity('usage_ledger')
export class UsageLedger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => BillableAction, { nullable: false })
  @JoinColumn({ name: 'actionId' })
  action: BillableAction;

  @Column('uuid')
  actionId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amountDeducted: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  balanceBefore: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  balanceAfter: number;

  @Column('uuid', { nullable: true })
  userProfileId?: string;

  @Column('uuid', { nullable: true })
  organizationId?: string;

  @Column('uuid', { nullable: true })
  relatedEntityId?: string;

  @Column({ type: 'varchar', nullable: true })
  relatedEntityType?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
