import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HiringPipelineRecruiterController } from './api/controllers/hiring-pipeline.recruiter.controller';
import { HiringPipelineRecruiterService } from './api/services/hiring-pipeline.service';
import { HiringPipeline } from './domain/entities/hiring-pipeline.entity';
import { PipelineStage } from './domain/entities/pipeline-stage.entity';
import { PipelineTransition } from './domain/entities/pipeline-transition.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PipelineTransition,
      PipelineStage,
      HiringPipeline
    ]),
  ],
  controllers: [HiringPipelineRecruiterController],
  providers: [HiringPipelineRecruiterService],
  exports: [HiringPipelineRecruiterService],
})
export class HiringPipelineModule {}
