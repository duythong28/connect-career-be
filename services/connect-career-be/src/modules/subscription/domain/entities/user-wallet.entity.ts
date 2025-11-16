import { User } from 'src/modules/identity/domain/entities';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('user_wallets')
export class UserWallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  userId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  creditBalance: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({ type: 'varchar', nullable: true })
  stripeCustomerId?: string;

  @Column({ type: 'varchar', nullable: true })
  paymentMethodId?: string;

  @Column({ type: 'boolean', default: false })
  autoTopUpEnabled: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  autoTopUpThreshold?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  autoTopUpAmount?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  hasSufficientBalance(amount: number): boolean {
    return this.creditBalance >= amount;
  }
}
