import { Controller, Post, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SyncService } from '../../infrastructure/elasticsearch/sync/sync-service.service';
import { JobIndexerService } from '../../infrastructure/elasticsearch/indexers/job-indexer.service';
import { OrganizationIndexerService } from '../../infrastructure/elasticsearch/indexers/organization-indexer.service';
import { PeopleIndexerService } from '../../infrastructure/elasticsearch/indexers/people-indexer.service';
import * as decorators from 'src/modules/identity/api/decorators';

@ApiTags('Search Sync')
@Controller('/v1/search/sync')
export class SyncController {
  constructor(
    private readonly syncService: SyncService,
    private readonly jobIndexer: JobIndexerService,
    private readonly organizationIndexer: OrganizationIndexerService,
    private readonly peopleIndexer: PeopleIndexerService,
  ) {}

  @Post('all')
  @decorators.Public()
  @ApiOperation({
    summary: 'Sync all data to Elasticsearch',
    description:
      'Reindex all jobs, organizations, and people from database to Elasticsearch. This may take a while for large datasets.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sync completed',
  })
  async syncAll() {
    return this.syncService.syncAll();
  }

  @Post('jobs')
  @decorators.Public()
  @ApiOperation({
    summary: 'Sync all jobs to Elasticsearch',
  })
  async syncAllJobs() {
    return this.jobIndexer.reindexAllJobs();
  }

  @Post('organizations')
  @decorators.Public()
  @ApiOperation({
    summary: 'Sync all organizations to Elasticsearch',
  })
  async syncAllOrganizations() {
    return this.organizationIndexer.reindexAllOrganizations();
  }

  @Post('people')
  @decorators.Public()
  @ApiOperation({
    summary: 'Sync all people to Elasticsearch',
  })
  async syncAllPeople() {
    return this.peopleIndexer.reindexAllPeople();
  }

  @Post('job/:jobId')
  @decorators.Public()
  @ApiOperation({
    summary: 'Sync a single job to Elasticsearch',
  })
  async syncJob(@Param('jobId') jobId: string) {
    await this.syncService.syncJob(jobId);
    return { message: `Job ${jobId} synced successfully` };
  }

  @Post('organization/:organizationId')
  @decorators.Public()
  @ApiOperation({
    summary: 'Sync a single organization to Elasticsearch',
  })
  async syncOrganization(@Param('organizationId') organizationId: string) {
    await this.syncService.syncOrganization(organizationId);
    return { message: `Organization ${organizationId} synced successfully` };
  }

  @Post('person/:userId')
  @decorators.Public()
  @ApiOperation({
    summary: 'Sync a single person to Elasticsearch',
  })
  async syncPerson(@Param('userId') userId: string) {
    await this.syncService.syncPerson(userId);
    return { message: `Person ${userId} synced successfully` };
  }
}