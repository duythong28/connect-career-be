import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, JobStatus } from '../../domain/entities/job.entity';
import {
  Application,
  ApplicationStatus,
} from '../../../applications/domain/entities/application.entity';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class JobStatusService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
  ) {}

  async updateJobStatusBasedOnApplications(jobId: string): Promise<Job | null> {
    const job = await this.jobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const applicationStats = await this.getApplicationStats(jobId);

    let newStatus = job.status;

    if (
      job.applicationsLimit &&
      applicationStats.hired >= job.applicationsLimit
    ) {
      newStatus = JobStatus.CLOSED;
    } else if (applicationStats.total > (job.applicationsLimit || 100)) {
      newStatus = JobStatus.PAUSED;
    } else if (job.closedDate && new Date() > job.closedDate) {
      newStatus = JobStatus.CLOSED;
    }

    if (newStatus !== job.status) {
      await this.jobRepository.update(jobId, {
        status: newStatus,
        closedDate: newStatus === JobStatus.CLOSED ? new Date() : undefined,
      });
    }

    return this.jobRepository.findOne({ where: { id: jobId } });
  }

  private async getApplicationStats(jobId: string): Promise<{
    total: number;
    hired: number;
    rejected: number;
    active: number;
  }> {
    const applications = await this.applicationRepository.find({
      where: { jobId },
    });

    return {
      total: applications.length,
      hired: applications.filter((a) => a.status === ApplicationStatus.HIRED)
        .length,
      rejected: applications.filter(
        (a) => a.status === ApplicationStatus.REJECTED,
      ).length,
      active: applications.filter(
        (a) =>
          ![
            ApplicationStatus.HIRED,
            ApplicationStatus.REJECTED,
            ApplicationStatus.WITHDRAWN,
          ].includes(a.status),
      ).length,
    };
  }

  async reopenJob(jobId: string, reason: string): Promise<Job | null> {
    const job = await this.jobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    await this.jobRepository.update(jobId, {
      status: JobStatus.ACTIVE,
      closedDate: undefined,
    });

    return this.jobRepository.findOne({ where: { id: jobId } });
  }
}
