import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ScorecardFieldType {
  RATING = 'rating',
  YES_NO = 'yes_no',
  TEXT = 'text',
  MULTI_SELECT = 'multi_select',
}

@Entity('scorecard_templates')
@Index(['organizationId', 'name', 'version'], { unique: true })
export class ScorecardTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  organizationId?: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'jsonb' })
  fields: Array<{
    key: string;
    label: string;
    type: ScorecardFieldType;
    required?: boolean;
    weight?: number;
    scaleMin?: number;
    scaleMax?: number;
    options?: string[];
    helpText?: string;
  }>;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
