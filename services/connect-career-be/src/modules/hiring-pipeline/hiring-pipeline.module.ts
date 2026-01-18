import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HiringPipelineRecruiterController } from './api/controllers/hiring-pipeline.recruiter.controller';
import { HiringPipelineRecruiterService } from './api/services/hiring-pipeline.service';
import { HiringPipeline } from './domain/entities/hiring-pipeline.entity';
import { PipelineStage } from './domain/entities/pipeline-stage.entity';
import { PipelineTransition } from './domain/entities/pipeline-transition.entity';
import { HiringPipelineSeeder } from './infrastructure/seeders/hiring-pipeline.seeder';
import { Job } from '../jobs/domain/entities/job.entity';
import { Organization } from '../profile/domain/entities/organization.entity';
import { HiringPipelineV2RecruiterController } from './api/controllers/hiring-pipeline.v2.recruiter.controller';
import { AIModule } from 'src/shared/infrastructure/external-services/ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PipelineTransition,
      PipelineStage,
      HiringPipeline,
      Organization,
      Job,
    ]),
    AIModule,
  ],
  controllers: [
    HiringPipelineRecruiterController,
    HiringPipelineV2RecruiterController,
  ],
  providers: [HiringPipelineRecruiterService, HiringPipelineSeeder],
  exports: [HiringPipelineRecruiterService, HiringPipelineSeeder],
})
export class HiringPipelineModule {}
