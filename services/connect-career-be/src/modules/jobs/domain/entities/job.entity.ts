import { Organization } from 'src/modules/profile/domain/entities/organization.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { JobPosting } from '../../infrastructure/types/job_linkedin.types';
import { User } from 'src/modules/identity/domain/entities';
import { HiringPipeline } from 'src/modules/hiring-pipeline/domain/entities/hiring-pipeline.entity';

export enum JobType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  FREELANCE = 'freelance',
  CONTRACT = 'contract',
  SEASONAL = 'seasonal',
  INTERNSHIP = 'internship',
  REMOTE = 'remote',
  OTHER = 'other',
}
export enum JobStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  CLOSED = 'closed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  ARCHIVED = 'archived',
}

export enum JobSeniorityLevel {
  ENTRY_LEVEL = 'Entry level',
  MID_SENIOR = 'Mid-Senior level',
  DIRECTOR = 'Director',
  EXECUTIVE = 'Executive',
  ASSOCIATE = 'Associate',
  INTERNSHIP = 'Internship',
  NOT_APPLICABLE = 'Not Applicable',
}

export enum JobSource {
  INTERNAL = 'internal',
  LINKEDIN = 'linkedin',
  EXTERNAL = 'external',
}
@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  @Index()
  title: string;

  @Index()
  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  userId: string;

  @Column({ type: 'varchar' })
  @Index()
  location: string;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  countryCode?: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  summary?: string;

  @Column({
    type: 'enum',
    enum: JobType,
    default: JobType.FULL_TIME,
  })
  @Index()
  type: JobType;

  @Column({
    type: 'enum',
    enum: JobSeniorityLevel,
    nullable: true,
  })
  seniorityLevel?: JobSeniorityLevel;

  @Column({ type: 'varchar', nullable: true })
  jobFunction?: string;

  @Column({ type: 'varchar', nullable: true })
  salary?: string;

  @Column({ type: 'jsonb', nullable: true })
  salaryDetails?: {
    currency: string;
    minAmount: number;
    maxAmount: number;
    paymentPeriod: string;
  };

  @Column({ type: 'text', nullable: true })
  salaryStandards?: string;

  @Column({ type: 'int', default: 0 })
  applications: number;

  @Column({ type: 'int', default: 0 })
  views: number;

  @Column({ type: 'text', nullable: true })
  applyLink?: string;

  @Column({ type: 'varchar', nullable: true })
  applicationAvailability?: string;

  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.DRAFT,
  })
  @Index()
  status: JobStatus;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  postedDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  closedDate?: Date;

  @Column('text', { nullable: true })
  @Index()
  companyId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  companyName: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  companyUrl?: string;

  @Column({ type: 'text', nullable: true })
  companyLogo?: string;

  @Column({
    type: 'enum',
    enum: JobSource,
    default: JobSource.INTERNAL,
  })
  @Index()
  source: JobSource;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sourceId?: string;

  @Column({ type: 'text', nullable: true })
  sourceUrl?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  titleId?: string;

  @Column('uuid', { nullable: true })
  employerId?: string;

  @Column('simple-array', { nullable: true })
  keywords?: string[];

  @Column({ type: 'jsonb', nullable: true })
  linkedinData?: {
    discoveryInput?: {
      experienceLevel?: string;
      jobType?: string;
      remote?: string;
      selectiveSearch?: string;
      timeRange?: string;
    };
    jobPoster?: {
      name?: string;
      title?: string;
      url?: string;
    };
  };

  @Column('simple-array', { nullable: true })
  savedByUserIds?: string[];

  @Column('simple-array', { nullable: true })
  appliedByUserIds?: string[];

  @ManyToOne(() => HiringPipeline, (pipeline) => pipeline.jobs, {
    nullable: true,
  })
  @JoinColumn({ name: 'hiringPipelineId' })
  hiringPipeline: HiringPipeline;

  @Column('uuid', { nullable: true })
  hiringPipelineId?: string;

  @Column({ type: 'int', nullable: true })
  applicationsLimit?: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date;

  @Column('simple-array', { nullable: true })
  requirements: string[];

  isActive(): boolean {
    return this.status === JobStatus.ACTIVE && !this.deletedAt;
  }

  isExternal(): boolean {
    return this.source !== JobSource.INTERNAL;
  }

  incrementViews(): void {
    this.views += 1;
  }

  incrementApplications(): void {
    this.applications += 1;
  }

  close(): void {
    this.status = JobStatus.CLOSED;
    this.closedDate = new Date();
  }

  activate(): void {
    this.status = JobStatus.ACTIVE;
    this.closedDate = undefined;
  }

  static fromLinkedIn(linkedinJob: JobPosting): Job {
    const job = new Job();

    job.source = JobSource.LINKEDIN;
    job.sourceId = linkedinJob.job_posting_id;
    job.sourceUrl = linkedinJob.url;
    job.titleId = linkedinJob.title_id;

    job.title = linkedinJob.job_title;
    job.companyName = linkedinJob.company_name;
    job.companyId = linkedinJob.company_id;
    job.companyUrl = linkedinJob.company_url;
    job.companyLogo = linkedinJob.company_logo;

    job.location = linkedinJob.job_location;
    job.description = linkedinJob.job_description_formatted;
    job.summary = linkedinJob.job_summary;

    job.type = this.mapLinkedInJobType(linkedinJob.job_employment_type);
    job.seniorityLevel = linkedinJob.job_seniority_level as JobSeniorityLevel;
    job.jobFunction = linkedinJob.job_function;

    job.salary = linkedinJob.job_base_pay_range;
    job.salaryStandards = linkedinJob.salary_standards;
    if (linkedinJob.base_salary) {
      job.salaryDetails = {
        currency: linkedinJob.base_salary.currency,
        minAmount: linkedinJob.base_salary.min_amount,
        maxAmount: linkedinJob.base_salary.max_amount,
        paymentPeriod: linkedinJob.base_salary.payment_period,
      };
    }
    job.applications = linkedinJob.job_num_applicants || 0;
    job.applyLink = linkedinJob.apply_link || '';
    job.applicationAvailability = linkedinJob.application_availability || '';

    job.postedDate = new Date(linkedinJob.job_posted_date);

    job.status = JobStatus.ACTIVE;
    job.linkedinData = {
      discoveryInput: linkedinJob.discovery_input
        ? {
            experienceLevel:
              linkedinJob.discovery_input.experience_level ?? undefined,
            jobType: linkedinJob.discovery_input.job_type ?? undefined,
            remote: linkedinJob.discovery_input.remote ?? undefined,
            selectiveSearch:
              linkedinJob.discovery_input.selective_search ?? undefined,
            timeRange: linkedinJob.discovery_input.time_range ?? undefined,
          }
        : undefined,
      jobPoster: linkedinJob.job_poster
        ? {
            name: linkedinJob.job_poster.name ?? undefined,
            title: linkedinJob.job_poster.title ?? undefined,
            url: linkedinJob.job_poster.url ?? undefined,
          }
        : undefined,
    };
    return job;
  }
  static mapLinkedInJobType(linkedinType: string): JobType {
    const typeMap: Record<string, JobType> = {
      'Full-time': JobType.FULL_TIME,
      'Part-time': JobType.PART_TIME,
      Contract: JobType.CONTRACT,
      Internship: JobType.INTERNSHIP,
    };

    return typeMap[linkedinType] || JobType.FULL_TIME;
  }
}
