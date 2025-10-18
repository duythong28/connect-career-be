import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PipelineStage } from './pipeline-stage.entity';
import { Job } from 'src/modules/jobs/domain/entities/job.entity';
import { PipelineTransition } from './pipeline-transition.entity';
import { Organization } from 'src/modules/profile/domain/entities/organization.entity';

@Entity('hiring_pipelines')
export class HiringPipeline {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @OneToMany(() => Job, (job) => job.hiringPipeline)
  jobs: Job[];

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @OneToMany(() => PipelineStage, (stage) => stage.pipeline)
  stages: PipelineStage[];

  @OneToMany(() => PipelineTransition, (t) => t.pipeline, {
    cascade: true,
    eager: true,
  })
  transitions: PipelineTransition[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
