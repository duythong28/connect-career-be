import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { HiringPipeline } from './hiring-pipeline.entity';

@Entity('hiring_pipeline_transitions')
@Index(['pipelineId', 'fromStageKey', 'toStageKey'], { unique: true })
export class PipelineTransition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => HiringPipeline, (p) => p.transitions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'pipelineId' })
  pipeline: HiringPipeline;

  @Column('uuid')
  @Index()
  pipelineId: string;

  @Column({ type: 'varchar', length: 80 })
  fromStageKey: string;

  @Column({ type: 'varchar', length: 80 })
  toStageKey: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  actionName?: string;

  @Column({ type: 'simple-array', nullable: true })
  allowedRoles?: string[];
}
