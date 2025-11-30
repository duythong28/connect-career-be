import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { Job } from 'src/modules/jobs/domain/entities/job.entity';

@Entity('job_cf_factors')
export class JobCfFactors {
  @PrimaryColumn('uuid')
  jobId: string;

  @OneToOne(() => Job, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobId' })
  job: Job;

  @Column({ type: 'jsonb' })
  factors: number[]
}
