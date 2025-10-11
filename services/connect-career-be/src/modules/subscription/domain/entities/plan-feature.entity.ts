import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Product } from './product.entity';

@Entity('plan_feature')
@Unique(['productId', 'featureKey'])
export class PlanFeature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  productId: string;

  @Column({ type: 'text' })
  featureKey: string;

  @Column({ type: 'int', nullable: true })
  limitMonth: number;

  @ManyToOne(() => Product, (product) => product.planFeatures)
  @JoinColumn({ name: 'productId' })
  product: Product;
}
