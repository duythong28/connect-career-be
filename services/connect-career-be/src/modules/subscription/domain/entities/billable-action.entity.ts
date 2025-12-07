import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ActionCategory {
  RECRUITER = 'recruiter',
  CANDIDATE = 'candidate',
  BOTH = 'both',
}

@Entity('billable_actions')
export class BillableAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  actionCode: string;

  @Column({ type: 'varchar' })
  actionName: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ActionCategory,
  })
  category: ActionCategory;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  cost: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    requiresProfile?: 'candidate' | 'recruiter';
    maxPerPeriod?: number;
    period?: 'daily' | 'monthly';
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
