import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PlanSubject } from './subscription.entity';
import { PlanFeature } from './plan-feature.entity';
import { Price } from './price.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  code: string;

  @Column({ type: 'string' })
  displayName: string;

  @Column({
    type: 'enum',
    enum: PlanSubject,
  })
  subject: PlanSubject;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Price, (price) => price.product)
  prices: Price[];

  @OneToMany(() => PlanFeature, (planFeature) => planFeature.product)
  planFeatures: PlanFeature[];
}
