import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job, JobSource, JobStatus } from '../../domain/entities/job.entity';
import { Repository } from 'typeorm';
import { JobSearchDto } from '../dtos/search-job.dto';
import { PaginatedResult } from 'src/shared/domain/interfaces/base.repository';
import { CreateJobDto } from '../dtos/create-job.dto';
import { User } from 'src/modules/identity/domain/entities';
import { Organization } from 'src/modules/profile/domain/entities/organization.entity';
import { PaginationDto } from 'src/shared/kernel';
import { JobStateMachineFactory } from '../../domain/state-machine/job-state-machine.factory';
import { JobTransitionContext } from './job-state-machine.interface';
import { HiringPipeline } from 'src/modules/hiring-pipeline/domain/entities/hiring-pipeline.entity';
import { QueueService } from 'src/shared/infrastructure/queue/queue.service';
import { EventBus } from '@nestjs/cqrs';
import { JobPublishedEvent } from '../../domain/events/job-published.event';

@Injectable()
export class JobService {
  constructor(
    @InjectRepository(Job) private readonly jobRepository: Repository<Job>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(HiringPipeline)
    private readonly hiringPipelineRepository: Repository<HiringPipeline>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly stateMachineFactory: JobStateMachineFactory,
    private readonly queueService: QueueService,
    private readonly eventBus: EventBus,
  ) {}

  async searchJobs(searchJobs: JobSearchDto): Promise<PaginatedResult<Job>> {
    const {
      pageNumber = 1,
      pageSize = 20,
      searchTerm,
      location,
      country,
      type,
      status = JobStatus.ACTIVE,
      seniorityLevel,
      source,
      organizationId,
      companyName,
      keywords,
      minSalary,
      maxSalary,
      postedAfter,
      postedBefore,
      sortBy = 'postedDate',
      sortOrder = 'DESC',
    } = searchJobs;
    const queryBuilder = this.jobRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.organization', 'organization')
      .leftJoinAndSelect('organization.logoFile', 'logoFile')
      .leftJoinAndSelect('organization.industry', 'industry')
      .leftJoinAndSelect('job.user', 'user');
    queryBuilder.where('job.status = :status', { status });

    if (searchTerm) {
      queryBuilder.andWhere(
        '(job.title ILIKE :search OR job.description ILIKE :search OR job.companyName ILIKE :search OR job.summary ILIKE :search)',
        { search: `%${searchTerm}%` },
      );
    }

    if (location) {
      queryBuilder.andWhere('job.location ILIKE :location', {
        location: `%${location}%`,
      });
    }

    if (country) {
      queryBuilder.andWhere('job.countryCode ILIKE :country', {
        country: `%${country}%`,
      });
    }

    if (type) {
      queryBuilder.andWhere('job.type = :type', { type });
    }

    if (seniorityLevel) {
      queryBuilder.andWhere('job.seniorityLevel = :seniorityLevel', {
        seniorityLevel,
      });
    }

    if (source) {
      queryBuilder.andWhere('job.source = :source', { source });
    }

    if (organizationId) {
      queryBuilder.andWhere('job.organizationId = :organizationId', {
        organizationId,
      });
    }

    if (companyName) {
      queryBuilder.andWhere('job.companyName ILIKE :companyName', {
        companyName: `%${companyName}%`,
      });
    }

    if (keywords && keywords.length > 0) {
      if (keywords.length > 0) {
        queryBuilder.andWhere(
          `
          EXISTS (
            SELECT 1
            FROM unnest(string_to_array(job.keywords, ',')) kwtxt
            WHERE lower(btrim(kwtxt)) = ANY(:keywords)
          )
        `,
          { keywords: keywords.map((k) => k.toLowerCase()) },
        );
      }
    }

    if (minSalary !== undefined) {
      queryBuilder.andWhere(
        `COALESCE(("job"."salaryDetails"->>'minAmount')::numeric, 0) >= :minSalary`,
        { minSalary },
      );
    }

    if (maxSalary !== undefined) {
      queryBuilder.andWhere(
        `COALESCE(("job"."salaryDetails"->>'maxAmount')::numeric, 0) <= :maxSalary`,
        { maxSalary },
      );
    }

    if (postedAfter) {
      queryBuilder.andWhere('job.postedDate >= :postedAfter', {
        postedAfter: new Date(postedAfter),
      });
    }

    if (postedBefore) {
      queryBuilder.andWhere('job.postedDate <= :postedBefore', {
        postedBefore: new Date(postedBefore),
      });
    }

    const validSortFields = [
      'postedDate',
      'createdAt',
      'applications',
      'views',
      'title',
      'companyName',
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'postedDate';
    queryBuilder.orderBy(`job.${sortField}`, sortOrder);

    const skip = (pageNumber - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page: pageNumber,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getJobById(id: string): Promise<Job> {
    const job = await this.jobRepository.findOne({
      where: { id },
      relations: [
        'organization',
        'user',
        'organization.logoFile',
        'organization.industry',
      ],
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    await this.incrementViews(id);

    return job;
  }

  async getJobsByOrganization(organizationId: string): Promise<Job[]> {
    return this.jobRepository.find({
      where: { organizationId },
      relations: [
        'organization',
        'user',
        'organization.logoFile',
        'organization.industry',
      ],
      order: { postedDate: 'DESC' },
    });
  }

  async getJobsByUserId(userId: string): Promise<Job[]> {
    return this.jobRepository.find({
      where: { userId },
      relations: [
        'organization',
        'organization.logoFile',
        'organization.industry',
      ],
      order: { postedDate: 'DESC' },
    });
  }

  async incrementViews(jobId: string): Promise<void> {
    await this.jobRepository.increment({ id: jobId }, 'views', 1);
  }

  async incrementApplications(jobId: string): Promise<void> {
    const job = await this.jobRepository.findOne({
      where: { id: jobId },
      relations: [
        'organization',
        'organization.logoFile',
        'organization.industry',
      ],
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    await this.jobRepository.increment({ id: jobId }, 'applications', 1);
  }

  async getJobStats() {
    const [
      totalJobs,
      activeJobs,
      totalApplications,
      totalViews,
      jobsByType,
      jobsBySource,
      topCompanies,
    ] = await Promise.all([
      // Total jobs
      this.jobRepository.count(),

      // Active jobs
      this.jobRepository.count({ where: { status: JobStatus.ACTIVE } }),

      // Total applications
      this.jobRepository
        .createQueryBuilder('job')
        .select('SUM(job.applications)', 'total')
        .getRawOne()
        .then((result) => parseInt(result.total || '0')),

      // Total views
      this.jobRepository
        .createQueryBuilder('job')
        .select('SUM(job.views)', 'total')
        .getRawOne()
        .then((result) => parseInt(result.total || '0')),

      // Jobs by type
      this.jobRepository
        .createQueryBuilder('job')
        .select('job.type', 'type')
        .addSelect('COUNT(*)', 'count')
        .where('job.status = :status', { status: JobStatus.ACTIVE })
        .groupBy('job.type')
        .getRawMany()
        .then((results) =>
          results.reduce(
            (acc, curr) => {
              acc[curr.type] = parseInt(curr.count);
              return acc;
            },
            {} as Record<string, number>,
          ),
        ),
      this.jobRepository
        .createQueryBuilder('job')
        .select('job.source', 'source')
        .addSelect('COUNT(*)', 'count')
        .groupBy('job.source')
        .getRawMany()
        .then((results) =>
          results.reduce(
            (acc, curr) => {
              acc[curr.source] = parseInt(curr.count);
              return acc;
            },
            {} as Record<string, number>,
          ),
        ),

      // Top 10 companies by job count
      this.jobRepository
        .createQueryBuilder('job')
        .select('job.companyName', 'companyName')
        .addSelect('COUNT(*)', 'count')
        .where('job.status = :status', { status: JobStatus.ACTIVE })
        .groupBy('job.companyName')
        .orderBy('COUNT(*)', 'DESC')
        .limit(10)
        .getRawMany()
        .then((results) =>
          results.map((r) => ({
            companyName: r.companyName,
            count: parseInt(r.count),
          })),
        ),
    ]);

    return {
      totalJobs,
      activeJobs,
      totalApplications,
      totalViews,
      jobsByType,
      jobsBySource,
      topCompanies,
    };
  }

  async getSimilarJobs(jobId: string, limit: number = 5): Promise<Job[]> {
    const job = await this.jobRepository.findOne({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    const queryBuilder = this.jobRepository
      .createQueryBuilder('job')
      .where('job.id != :jobId', { jobId })
      .andWhere('job.status = :status', { status: JobStatus.ACTIVE });

    if (job.keywords && job.keywords.length > 0) {
      queryBuilder.andWhere('job.keywords && :keywords', {
        keywords: job.keywords,
      });
    }

    // Add secondary similarity factors
    queryBuilder
      .orWhere('job.location ILIKE :location', {
        location: `%${job.location}%`,
      })
      .orderBy('job.postedDate', 'DESC')
      .limit(limit);

    return queryBuilder.getMany();
  }

  async getLatestJobs(limit: number = 10): Promise<Job[]> {
    return this.jobRepository.find({
      where: { status: JobStatus.ACTIVE },
      relations: [
        'organization',
        'organization.logoFile',
        'organization.industry',
      ],
      order: { postedDate: 'DESC' },
      take: limit,
    });
  }

  async getFeaturedJobs(limit: number = 10): Promise<Job[]> {
    return this.jobRepository.find({
      where: { status: JobStatus.ACTIVE },
      relations: [
        'organization',
        'organization.logoFile',
        'organization.industry',
      ],
      order: { applications: 'DESC', views: 'DESC' },
      take: limit,
    });
  }

  async searchByKeywords(keyword: string, limit: number = 10): Promise<Job[]> {
    return this.jobRepository
      .createQueryBuilder('job')
      .where('job.status = :status', { status: JobStatus.ACTIVE })
      .andWhere(":keyword = ANY(string_to_array(job.keywords, ','))", {
        keyword: keyword.toLowerCase(),
      })
      .limit(limit)
      .getMany();
  }

  async getJobLocations(): Promise<string[]> {
    const results = await this.jobRepository
      .createQueryBuilder('job')
      .select('DISTINCT job.location', 'location')
      .where('job.status = :status', { status: JobStatus.ACTIVE })
      .orderBy('job.location', 'ASC')
      .getRawMany();

    return results.map((r) => r.location).filter(Boolean);
  }

  async getJobKeywords(): Promise<string[]> {
    const results = await this.jobRepository
      .createQueryBuilder('job')
      .select('DISTINCT UNNEST(job.keywords)', 'keyword')
      .where('job.status = :status', { status: JobStatus.ACTIVE })
      .getRawMany();

    return results.map((r) => r.keyword).filter(Boolean);
  }

  /**
   * Get jobs count by company
   */
  async getCompanyJobsCount(companyName: string): Promise<number> {
    return this.jobRepository.count({
      where: {
        companyName,
        status: JobStatus.ACTIVE,
      },
    });
  }

  async createJob(userId: string, createJobDto: CreateJobDto): Promise<Job> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    const organization = await this.organizationRepository.findOne({
      where: { userId },
    });
    if (!organization) {
      throw new NotFoundException(
        `Organization with User ID ${userId} not found`,
      );
    }
    const hiringPipeline = await this.hiringPipelineRepository.findOne({
      where: { id: createJobDto.hiringPipelineId },
    });
    const jobDataForCreate: Partial<Job> = {
      ...createJobDto,
      userId,
      organizationId: organization.id,
      source: JobSource.INTERNAL,
      status: JobStatus.DRAFT,
      postedDate:
        createJobDto.status === JobStatus.ACTIVE ? new Date() : undefined,
    };
    if (!hiringPipeline) {
      throw new NotFoundException(
        `Hiring pipeline with ID ${createJobDto.hiringPipelineId} not found`,
      );
    }
    if (hiringPipeline) {
      jobDataForCreate.hiringPipelineId = hiringPipeline.id;
    }
    const job = this.jobRepository.create(jobDataForCreate);
    const savedJob = await this.jobRepository.save(job);
    if (savedJob.status === JobStatus.ACTIVE) {
      await this.queueJobEmbedding(savedJob);
    }

    return savedJob;
  }

  async updateJob(
    id: string,
    userId: string,
    updateJobDto: Partial<CreateJobDto>,
  ): Promise<Job> {
    const job = await this.jobRepository.findOne({
      where: { id, userId },
    });

    if (!job) {
      throw new Error(
        'Job not found or you do not have permission to update it',
      );
    }
    const oldStatus = job.status;
    Object.assign(job, updateJobDto);

    if (
      updateJobDto.status === JobStatus.ACTIVE &&
      job.status !== JobStatus.ACTIVE &&
      !job.postedDate
    ) {
      job.postedDate = new Date();
    }
    const updatedJob = await this.jobRepository.save(job);
    if (
      updatedJob.status === JobStatus.ACTIVE &&
      (updateJobDto.title ||
        updateJobDto.description ||
        updateJobDto.location ||
        updateJobDto.requirements)
    ) {
      await this.queueJobEmbedding(updatedJob);
    }
    return updatedJob;
  }
  private async queueJobEmbedding(job: Job): Promise<void> {
    // Fetch organization data if needed
    const organization = await this.organizationRepository.findOne({
      where: { id: job.organizationId },
      relations: ['industry'],
    });

    await this.queueService.queueJobEmbedding({
      jobId: job.id,
      title: job.title,
      description: job.description,
      summary: job.summary,
      location: job.location,
      jobFunction: job.jobFunction,
      seniorityLevel: job.seniorityLevel,
      type: job.type,
      requirements: job.requirements,
      keywords: job.keywords,
      organizationName: organization?.name,
      organizationShortDescription: organization?.shortDescription,
      organizationLongDescription: organization?.longDescription,
      organizationIndustry: organization?.industry?.name,
    });
  }

  async deleteJob(id: string, userId: string): Promise<void> {
    const job = await this.jobRepository.findOne({
      where: { id, userId },
    });

    if (!job) {
      throw new Error(
        'Job not found or you do not have permission to delete it',
      );
    }
    await this.jobRepository.remove(job);
  }

  async updateJobStatus(
    id: string,
    userId: string,
    status: JobStatus,
  ): Promise<Job> {
    const job = await this.jobRepository.findOne({
      where: { id, userId },
    });
    if (!job) {
      throw new Error(
        'Job not found or you do not have permission to update it',
      );
    }
    const oldStatus = job.status;
    job.status = status;

    if (
      status === JobStatus.ACTIVE &&
      oldStatus !== JobStatus.ACTIVE &&
      !job.postedDate
    ) {
      job.postedDate = new Date();
      
      // Publish JobPublishedEvent when job becomes ACTIVE
      this.eventBus.publish(
        new JobPublishedEvent(
          job.id,
          job.title,
          job.organizationId,
          job.userId,
          JobStatus.ACTIVE,
        ),
      );
    }

    if (status === JobStatus.CLOSED && oldStatus !== JobStatus.CLOSED) {
      job.closedDate = new Date();
    }

    return await this.jobRepository.save(job);
  }

  async getJobsByRecruiter(
    userId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResult<Job>> {
    const { pageNumber = 1, pageSize = 10 } = paginationDto;
    const skip = (pageNumber - 1) * pageSize;
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    const organization = await this.organizationRepository.findOne({
      where: { userId },
    });
    if (!organization) {
      throw new NotFoundException(
        `Organization with User ID ${userId} not found`,
      );
    }
    const [jobs, total] = await this.jobRepository.findAndCount({
      where: { organizationId: organization.id, userId },
      relations: [
        'organization',
        'organization.logoFile',
        'organization.industry',
      ],
      skip,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });
    return {
      data: jobs,
      total,
      page: pageNumber,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async updateJobStatusWithContextByStateMachine(
    id: string,
    userId: string,
    newStatus: JobStatus,
    context?: JobTransitionContext,
  ): Promise<Job> {
    const job = await this.jobRepository.findOne({ where: { id, userId } });
    if (!job) {
      throw new Error(
        'Job not found or you do not have permission to update it',
      );
    }

    const stateMachine = this.stateMachineFactory.createStateMachine(job);
    const transitionContext: JobTransitionContext = {
      userId,
      ...context,
    };
    await stateMachine.transitionTo(newStatus, transitionContext);
    return await this.jobRepository.save(job);
  }

  async getJobStateInfo(
    id: string,
    userId: string,
  ): Promise<{
    currentState: JobStatus;
    availableTransitions: JobStatus[];
    canTransitionTo: (targetState: JobStatus) => boolean;
  }> {
    const job = await this.jobRepository.findOne({ where: { id, userId } });
    if (!job) {
      throw new Error(
        'Job not found or you do not have permission to update it',
      );
    }
    const stateMachine = this.stateMachineFactory.createStateMachine(job);
    return {
      currentState: stateMachine.getCurrentState(),
      availableTransitions: stateMachine.getAvailableTransitions(),
      canTransitionTo: (targetState: JobStatus) =>
        stateMachine.canTransitionTo(targetState),
    };
  }

  async pauseJob(id: string, userId: string, reason?: string): Promise<Job> {
    return this.updateJobStatusWithContextByStateMachine(
      id,
      userId,
      JobStatus.PAUSED,
      {
        reason,
        userId: userId,
      },
    );
  }

  async resumeJob(id: string, userId: string): Promise<Job> {
    return this.updateJobStatusWithContextByStateMachine(
      id,
      userId,
      JobStatus.ACTIVE,
    );
  }

  async cancelJob(id: string, userId: string, reason: string): Promise<Job> {
    return this.updateJobStatusWithContextByStateMachine(
      id,
      userId,
      JobStatus.CANCELLED,
      {
        reason,
        userId: userId,
      },
    );
  }

  async archiveJob(id: string, userId: string): Promise<Job> {
    return this.updateJobStatusWithContextByStateMachine(
      id,
      userId,
      JobStatus.ARCHIVED,
    );
  }

  async getJobsByIds(ids: string[]): Promise<Job[]> {
    if (!ids || ids.length === 0) {
      return [];
    }

    return this.jobRepository.find({
      where: ids.map((id) => ({ id })),
      relations: [
        'organization',
        'organization.logoFile',
        'organization.industry',
        'user',
      ],
      order: { postedDate: 'DESC' },
    });
  }
}
