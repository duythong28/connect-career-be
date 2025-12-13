import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { Redis } from 'ioredis';
import {
  JobEmbeddingProcessor,
  UserEmbeddingProcessor,
  BatchEmbeddingProcessor,
  CFTrainingProcessor,
} from './processors/embedding.processor';
import { QueueService } from './queue.service';
import { QueueOptions } from 'bullmq';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    HttpModule,
    forwardRef(() => CacheModule),
    BullModule.forRootAsync({
      imports: [ConfigModule, CacheModule],
      useFactory: (
        configService: ConfigService,
        redis: Redis,
      ): QueueOptions => {
        return {
          connection: redis,
          // Add connection options to handle Redis failures gracefully
          defaultJobOptions: {
            removeOnComplete: {
              age: 3600, // 1 hour
              count: 1000,
            },
            removeOnFail: {
              age: 86400, // 24 hours
            },
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
        };
      },
      inject: [ConfigService, Redis],
    }),
    BullModule.registerQueue(
      { 
        name: 'embedding-jobs',
        defaultJobOptions: {
          removeOnComplete: { age: 3600, count: 1000 },
          removeOnFail: { age: 86400 },
        },
      },
      { 
        name: 'embedding-users',
        defaultJobOptions: {
          removeOnComplete: { age: 3600, count: 1000 },
          removeOnFail: { age: 86400 },
        },
      },
      { 
        name: 'batch-embeddings',
        defaultJobOptions: {
          removeOnComplete: { age: 3600, count: 1000 },
          removeOnFail: { age: 86400 },
        },
      },
      { 
        name: 'cf-training',
        defaultJobOptions: {
          removeOnComplete: { age: 3600, count: 1000 },
          removeOnFail: { age: 86400 },
        },
      },
    ),
  ],
  providers: [
    JobEmbeddingProcessor,
    UserEmbeddingProcessor,
    BatchEmbeddingProcessor,
    CFTrainingProcessor,
    QueueService,
  ],
  exports: [QueueService, BullModule],
})
export class QueueModule {}