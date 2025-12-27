import { Injectable, Logger } from '@nestjs/common';
import { JobIndexerService } from '../indexers/job-indexer.service';
import { OrganizationIndexerService } from '../indexers/organization-indexer.service';
import { PeopleIndexerService } from '../indexers/people-indexer.service';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly jobIndexer: JobIndexerService,
    private readonly organizationIndexer: OrganizationIndexerService,
    private readonly peopleIndexer: PeopleIndexerService,
  ) {}

  async syncJob(jobId: string): Promise<void> {
    await this.jobIndexer.indexJob(jobId);
  }

  async syncOrganization(organizationId: string): Promise<void> {
    await this.organizationIndexer.indexOrganization(organizationId);
  }

  async syncPerson(userId: string): Promise<void> {
    await this.peopleIndexer.indexPerson(userId);
  }

  async syncAll(): Promise<{
    jobs: { indexed: number; failed: number };
    organizations: { indexed: number; failed: number };
    people: { indexed: number; failed: number };
  }> {
    this.logger.log('Starting full sync of all indices...');

    const [jobs, organizations, people] = await Promise.all([
      this.jobIndexer.reindexAllJobs(),
      this.organizationIndexer.reindexAllOrganizations(),
      this.peopleIndexer.reindexAllPeople(),
    ]);

    this.logger.log('Full sync completed', { jobs, organizations, people });

    return { jobs, organizations, people };
  }
}
