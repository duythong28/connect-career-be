// services/connect-career-be/src/modules/subscription/domain/entities/entitlement.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { PlanSubject } from './subscription.entity';
import { Subscription } from './subscription.entity';

@Entity('entitlement')
@Index(['subjectType', 'subjectId'])
@Unique(['subjectType', 'subjectId', 'featureKey'])
export class Entitlement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: PlanSubject,
  })
  subjectType: PlanSubject;

  @Column('uuid')
  subjectId: string;

  @Column({ type: 'text' })
  featureKey: string;

  @Column({ type: 'int', nullable: true })
  limitMonth: number;

  @Column('uuid', { nullable: true })
  sourceSubscriptionId: string;

  @ManyToOne(() => Subscription, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sourceSubscriptionId' })
  sourceSubscription: Subscription;

  get isUnlimited(): boolean {
    return this.limitMonth === null;
  }

  canUse(used: number): boolean {
    return this.isUnlimited || used < this.limitMonth;
  }
}
