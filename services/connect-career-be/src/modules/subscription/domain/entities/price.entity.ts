import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Provider } from './subscription.entity';
import { Product } from './product.entity';

@Entity('prices')
export class Price {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  productId: string;

  @Column({ type: 'text', default: 'VND' })
  currency: string;

  @Column({ type: 'bigint' })
  unitAmount: number;

  @Column({ type: 'text', default: 'month' })
  interval: string;

  @Column({ type: 'enum', enum: Provider, nullable: true })
  provider: Provider;

  @Column({ type: 'text', nullable: true })
  providerPriceId: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @ManyToOne(() => Product, (product) => product.prices)
  @JoinColumn({ name: 'productId' })
  product: Product;
}
