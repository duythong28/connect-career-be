import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobCfFactors } from './domain/entities/job-cf-factors.entity';
import { UserCfFactors } from './domain/entities/user-cf-factors.entity';
import { UserContentEmbedding } from './domain/entities/user-content-embedding.entity';
import { JobContentEmbedding } from './domain/entities/job-content-embedding.entity';
import { UserPreferences } from './domain/entities/user-preferences.entity';
import { JobInteraction } from './domain/entities/job-interaction.entity';
import { RecommendationService } from './apis/service/recommendation.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      JobCfFactors,
      UserCfFactors,
      JobInteraction,
      JobContentEmbedding,
      UserContentEmbedding,
      UserPreferences,
    ]),
  ],
  providers: [
    RecommendationService,
  ],
  exports: [
    RecommendationService
  ],
})
export class RecommendationModule {}
