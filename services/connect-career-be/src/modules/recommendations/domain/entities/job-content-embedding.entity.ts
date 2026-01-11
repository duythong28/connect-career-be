import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Job } from 'src/modules/jobs/domain/entities/job.entity';

@Entity('job_content_embeddings')
export class JobContentEmbedding {
  @PrimaryColumn('uuid')
  jobId: string;

  @OneToOne(() => Job, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobId' })
  job: Job;

  @Column({ type: 'jsonb' })
  embedding: number[];
}
