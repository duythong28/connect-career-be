import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  JobEmbeddingData,
  UserEmbeddingData,
} from './processors/embedding.processor';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('embedding-jobs')
    private readonly jobEmbeddingQueue: Queue<JobEmbeddingData>,
    @InjectQueue('embedding-users')
    private readonly userEmbeddingQueue: Queue<UserEmbeddingData>,
    @InjectQueue('batch-embeddings')
    private readonly batchEmbeddingQueue: Queue,
    @InjectQueue('cf-training')
    private readonly cfTrainingQueue: Queue,
  ) {}

  async queueJobEmbedding(data: JobEmbeddingData): Promise<void> {
    await this.jobEmbeddingQueue.add('generate-job-embedding', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        age: 3600, // Keep completed jobs for 1 hour
        count: 1000,
      },
      removeOnFail: {
        age: 86400, // Keep failed jobs for 24 hours
      },
    });
  }

  async queueUserEmbedding(data: UserEmbeddingData): Promise<void> {
    await this.userEmbeddingQueue.add('generate-user-embedding', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        age: 3600,
        count: 1000,
      },
      removeOnFail: {
        age: 86400,
      },
    });
  }

  async queueBatchEmbeddings(type: 'jobs' | 'users'): Promise<void> {
    await this.batchEmbeddingQueue.add('batch-embedding', { type }, {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
  }

  async queueCFTraining(): Promise<void> {
    await this.cfTrainingQueue.add('train-cf', {}, {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 10000,
      },
    });
  }
}