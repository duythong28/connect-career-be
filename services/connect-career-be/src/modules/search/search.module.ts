import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ElasticsearchModule } from './infrastructure/elasticsearch/elasticsearch.module';
import { SearchController } from './api/controllers/search.controller';
import { SyncController } from './api/controllers/sync.controller'; // ADD THIS
import { SemanticSearchService } from './infrastructure/semantic/semantic-search.service';
import { JobContentEmbedding } from 'src/modules/recommendations/domain/entities/job-content-embedding.entity';
import { UserContentEmbedding } from 'src/modules/recommendations/domain/entities/user-content-embedding.entity';
import { Job } from 'src/modules/jobs/domain/entities/job.entity';
import { User } from 'src/modules/identity/domain/entities/user.entity';

@Module({
  imports: [
    ElasticsearchModule,
    HttpModule,
    TypeOrmModule.forFeature([
      JobContentEmbedding,
      UserContentEmbedding,
      Job,
      User,
    ]),
  ],
  controllers: [SearchController, SyncController],
  providers: [SemanticSearchService],
  exports: [SemanticSearchService],
})
export class SearchModule {}
