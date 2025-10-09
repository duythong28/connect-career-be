import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job, JobStatus } from '../../domain/entities/job.entity';
import { Repository } from 'typeorm';
import { JobSearchDto } from '../dtos/job-search.dto';
import { PaginatedResult } from 'src/shared/domain/interfaces/base.repository';

@Injectable()
export class JobService {
  constructor(
    @InjectRepository(Job) private readonly jobRepository: Repository<Job>,
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
        queryBuilder.andWhere(`
          EXISTS (
            SELECT 1
            FROM unnest(string_to_array(job.keywords, ',')) kwtxt
            WHERE lower(btrim(kwtxt)) = ANY(:keywords)
          )
        `, { keywords: keywords.map(k => k.toLowerCase()) });
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
      relations: ['organization', 'user'],
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    // Increment views count
    await this.incrementViews(id);

    return job;
  }

  async getJobsByOrganization(organizationId: string): Promise<Job[]> {
    return this.jobRepository.find({
      where: { organizationId },
      relations: ['organization', 'user'],
      order: { postedDate: 'DESC' },
    });
  }

  async getJobsByUserId(userId: string): Promise<Job[]> {
    return this.jobRepository.find({
      where: { userId },
      relations: ['organization'],
      order: { postedDate: 'DESC' },
    });
  }

  async incrementViews(jobId: string): Promise<void> {
    await this.jobRepository.increment({ id: jobId }, 'views', 1);
  }

  async incrementApplications(jobId: string): Promise<void> {
    const job = await this.jobRepository.findOne({ where: { id: jobId } });

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
      .orWhere('job.companyName = :companyName', {
        companyName: job.companyName,
      })
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
      relations: ['organization'],
      order: { postedDate: 'DESC' },
      take: limit,
    });
  }

  async getFeaturedJobs(limit: number = 10): Promise<Job[]> {
    return this.jobRepository.find({
      where: { status: JobStatus.ACTIVE },
      relations: ['organization'],
      order: { applications: 'DESC', views: 'DESC' },
      take: limit,
    });
  }

  async searchByKeywords(keyword: string, limit: number = 10): Promise<Job[]> {
    return this.jobRepository
      .createQueryBuilder('job')
      .where('job.status = :status', { status: JobStatus.ACTIVE })
      .andWhere(':keyword = ANY(string_to_array(job.keywords, \',\'))', {
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
}
