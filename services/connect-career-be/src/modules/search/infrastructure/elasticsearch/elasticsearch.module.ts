// src/modules/search/infrastructure/elasticsearch/elasticsearch.module.ts
import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElasticsearchService } from './elasticsearch.service';
import { JobIndexerService } from './indexers/job-indexer.service';
import { OrganizationIndexerService } from './indexers/organization-indexer.service';
import { PeopleIndexerService } from './indexers/people-indexer.service';
import { SyncService } from './sync/sync-service.service';
import { BatchSyncService } from './sync/batch-sync.service';
import { SearchService } from '../search/search.service';
import { JobQueryBuilderService } from './queries/job-query-builder.service';
import { OrganizationQueryBuilderService } from './queries/organization-query-builder.service';
import { PeopleQueryBuilderService } from './queries/people-query-builder.service';
import { Client } from '@elastic/elasticsearch';
import { Job } from 'src/modules/jobs/domain/entities/job.entity';
import { Organization } from 'src/modules/profile/domain/entities/organization.entity';
import { User } from 'src/modules/identity/domain/entities/user.entity';

@Global()
@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Job, Organization, User])],
  providers: [
    {
      provide: 'ELASTICSEARCH_CLIENT',
      useFactory: (configService: ConfigService) => {
        return new Client({
          node:
            configService.get<string>('ELASTICSEARCH_NODE') ||
            'http://localhost:9200',
          auth: {
            username: configService.get<string>('ELASTICSEARCH_USERNAME') || '',
            password: configService.get<string>('ELASTICSEARCH_PASSWORD') || '',
          },
        });
      },
      inject: [ConfigService],
    },
    ElasticsearchService,
    JobIndexerService,
    OrganizationIndexerService,
    PeopleIndexerService,
    SyncService,
    BatchSyncService,
    SearchService,
    JobQueryBuilderService,
    OrganizationQueryBuilderService,
    PeopleQueryBuilderService,
  ],
  exports: [
    ElasticsearchService,
    JobIndexerService,
    OrganizationIndexerService,
    PeopleIndexerService,
    SyncService,
    BatchSyncService,
    SearchService,
  ],
})
export class ElasticsearchModule {}
