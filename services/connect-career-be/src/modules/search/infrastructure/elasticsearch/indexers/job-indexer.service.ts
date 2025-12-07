import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'src/modules/jobs/domain/entities/job.entity';
import { ElasticsearchService } from '../elasticsearch.service';

@Injectable()
export class JobIndexerService {
  private readonly logger = new Logger(JobIndexerService.name);

  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    private readonly elasticsearchService: ElasticsearchService,
  ) {}

  async indexJob(jobId: string): Promise<void> {
    try {
      const job = await this.jobRepository.findOne({
        where: { id: jobId },
        relations: ['organization', 'organization.logoFile'],
      });

      if (!job) {
        this.logger.warn(`Job not found: ${jobId}`);
        return;
      }

      await this.elasticsearchService.indexJob(job);
      this.logger.log(`Successfully indexed job: ${jobId}`);
    } catch (error) {
      this.logger.error(`Failed to index job ${jobId}:`, error);
      throw error;
    }
  }

  async indexJobs(jobIds: string[]): Promise<void> {
    const results = await Promise.allSettled(
      jobIds.map((id) => this.indexJob(id)),
    );

    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      this.logger.warn(`Failed to index ${failed.length} out of ${jobIds.length} jobs`);
    }
  }

  async removeJob(jobId: string): Promise<void> {
    try {
      await this.elasticsearchService.deleteJob(jobId);
      this.logger.log(`Successfully removed job from index: ${jobId}`);
    } catch (error) {
      this.logger.error(`Failed to remove job ${jobId}:`, error);
      throw error;
    }
  }

  async reindexAllJobs(): Promise<{ indexed: number; failed: number }> {
    this.logger.log('Starting full job reindexing...');
    let indexed = 0;
    let failed = 0;

    const batchSize = 100;
    let offset = 0;

    while (true) {
      const jobs = await this.jobRepository.find({
        take: batchSize,
        skip: offset,
        relations: ['organization', 'organization.logoFile'],
      });

      if (jobs.length === 0) break;

      for (const job of jobs) {
        try {
          await this.elasticsearchService.indexJob(job);
          indexed++;
        } catch (error) {
          this.logger.error(`Failed to index job ${job.id}:`, error);
          failed++;
        }
      }

      offset += batchSize;
      this.logger.log(`Indexed ${indexed} jobs, failed: ${failed}`);
    }

    this.logger.log(`Reindexing complete. Indexed: ${indexed}, Failed: ${failed}`);
    return { indexed, failed };
  }
}

