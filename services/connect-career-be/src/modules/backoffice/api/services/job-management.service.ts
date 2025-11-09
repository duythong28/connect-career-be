import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, JobStatus } from 'src/modules/jobs/domain/entities/job.entity';
import { Organization } from 'src/modules/profile/domain/entities/organization.entity';
import {
  JobListQueryDto,
  UpdateJobStatusDto,
} from '../dtos/job-management.dto';

@Injectable()
export class JobManagementService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {}

  async getJobs(query: JobListQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.jobRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.organization', 'organization');

    if (query.search) {
      queryBuilder.andWhere('job.title ILIKE :search', {
        search: `%${query.search}%`,
      });
    }

    if (query.organizationId) {
      queryBuilder.andWhere('job.organizationId = :organizationId', {
        organizationId: query.organizationId,
      });
    }

    if (query.status) {
      queryBuilder.andWhere('job.status = :status', { status: query.status });
    }

    const [data, total] = await queryBuilder
      .orderBy('job.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getJobById(jobId: string): Promise<Job> {
    const job = await this.jobRepository.findOne({
      where: { id: jobId },
      relations: ['organization'],
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  async updateJobStatus(
    jobId: string,
    updateDto: UpdateJobStatusDto,
    adminId: string,
  ): Promise<Job> {
    const job = await this.jobRepository.findOne({
      where: { id: jobId },
      relations: ['organization'],
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const oldStatus = job.status;
    job.status = updateDto.status;

    // Update dates based on status
    if (
      updateDto.status === JobStatus.ACTIVE &&
      oldStatus !== JobStatus.ACTIVE
    ) {
      job.postedDate = new Date();
    } else if (updateDto.status === JobStatus.CLOSED) {
      job.closedDate = new Date();
    }

    await this.jobRepository.save(job);
    return job;
  }

  async deleteJob(jobId: string): Promise<void> {
    const job = await this.jobRepository.findOne({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    await this.jobRepository.remove(job);
  }
}
