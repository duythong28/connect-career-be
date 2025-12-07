import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QueueService } from '../queue.service';
import { Logger } from '@nestjs/common';

@Injectable()
export class EmbeddingScheduler {
  private readonly logger = new Logger(EmbeddingScheduler.name);

  constructor(private readonly queueService: QueueService) {}

  // Run batch job embeddings every 6 hours
  @Cron(CronExpression.EVERY_6_HOURS)
  async scheduleBatchJobEmbeddings() {
    this.logger.log('Scheduling batch job embeddings...');
    await this.queueService.queueBatchEmbeddings('jobs');
  }

  // Run batch user embeddings every 12 hours
  @Cron(CronExpression.EVERY_12_HOURS)
  async scheduleBatchUserEmbeddings() {
    this.logger.log('Scheduling batch user embeddings...');
    await this.queueService.queueBatchEmbeddings('users');
  }

  // Run CF training daily at 2 AM
  @Cron('0 2 * * *')
  async scheduleCFTraining() {
    this.logger.log('Scheduling CF training...');
    await this.queueService.queueCFTraining();
  }
}
