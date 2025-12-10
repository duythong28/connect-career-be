import { Injectable, Logger } from '@nestjs/common';
import { JobIndexerService } from '../indexers/job-indexer.service';
import { OrganizationIndexerService } from '../indexers/organization-indexer.service';
import { PeopleIndexerService } from '../indexers/people-indexer.service';

@Injectable()
export class BatchSyncService {
  private readonly logger = new Logger(BatchSyncService.name);
  private readonly BATCH_SIZE = 50;

  constructor(
    private readonly jobIndexer: JobIndexerService,
    private readonly organizationIndexer: OrganizationIndexerService,
    private readonly peopleIndexer: PeopleIndexerService,
  ) {}

  async batchSyncJobs(jobIds: string[]): Promise<void> {
    this.logger.log(`Starting batch sync of ${jobIds.length} jobs`);

    for (let i = 0; i < jobIds.length; i += this.BATCH_SIZE) {
      const batch = jobIds.slice(i, i + this.BATCH_SIZE);
      await this.jobIndexer.indexJobs(batch);
      this.logger.log(`Processed batch ${Math.floor(i / this.BATCH_SIZE) + 1}`);
    }

    this.logger.log('Batch job sync completed');
  }

  async batchSyncOrganizations(organizationIds: string[]): Promise<void> {
    this.logger.log(
      `Starting batch sync of ${organizationIds.length} organizations`,
    );

    for (let i = 0; i < organizationIds.length; i += this.BATCH_SIZE) {
      const batch = organizationIds.slice(i, i + this.BATCH_SIZE);
      await this.organizationIndexer.indexOrganizations(batch);
      this.logger.log(`Processed batch ${Math.floor(i / this.BATCH_SIZE) + 1}`);
    }

    this.logger.log('Batch organization sync completed');
  }

  async batchSyncPeople(userIds: string[]): Promise<void> {
    this.logger.log(`Starting batch sync of ${userIds.length} people`);

    for (let i = 0; i < userIds.length; i += this.BATCH_SIZE) {
      const batch = userIds.slice(i, i + this.BATCH_SIZE);
      await this.peopleIndexer.indexPeople(batch);
      this.logger.log(`Processed batch ${Math.floor(i / this.BATCH_SIZE) + 1}`);
    }

    this.logger.log('Batch people sync completed');
  }
}
