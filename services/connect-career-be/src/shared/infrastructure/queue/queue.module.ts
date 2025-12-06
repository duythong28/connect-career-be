import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import {
  JobEmbeddingProcessor,
  UserEmbeddingProcessor,
  BatchEmbeddingProcessor,
  CFTrainingProcessor,
} from './processors/embedding.processor';
import { QueueService } from './queue.service';
import { QueueOptions } from 'bullmq';

@Module({
  imports: [
    HttpModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): QueueOptions => ({
        connection: {
          host: configService.get<string>('REDIS_HOST') || 'localhost',
          port: parseInt(configService.get<string>('REDIS_PORT') || '6379', 10),
          password: configService.get<string>('REDIS_PASSWORD'),
        },
      }), 
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: 'embedding-jobs' },
      { name: 'embedding-users' },
      { name: 'batch-embeddings' },
      { name: 'cf-training' },
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