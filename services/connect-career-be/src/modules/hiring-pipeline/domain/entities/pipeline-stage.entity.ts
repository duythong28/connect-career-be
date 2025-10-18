// services/connect-career-be/src/modules/hiring-pipeline/domain/entities/pipeline-stage.entity.ts
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { HiringPipeline } from './hiring-pipeline.entity';

export enum PipelineStageType {
  SOURCING = 'sourcing',
  SCREENING = 'screening',
  INTERVIEW = 'interview',
  OFFER = 'offer',
  HIRED = 'hired',
  REJECTED = 'rejected',
  ON_HOLD = 'on-hold',
  CUSTOM = 'custom',
}

@Entity('hiring_pipeline_stages')
@Index(['pipelineId', 'order'], { unique: true })
@Index(['pipelineId', 'key'], { unique: true })
export class PipelineStage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  pipelineId: string;

  @ManyToOne(() => HiringPipeline, (p) => p.stages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pipelineId' })
  pipeline: HiringPipeline;

  @Column({ type: 'varchar', nullable: true })
  key: string;

  @Column({ type: 'varchar', nullable: true })
  name: string;

  @Column({
    type: 'enum',
    enum: PipelineStageType,
    default: PipelineStageType.CUSTOM,
  })
  type: PipelineStageType;

  @Column({ type: 'int' })
  order: number;

  @Column({ type: 'boolean', default: false })
  terminal: boolean;
}
