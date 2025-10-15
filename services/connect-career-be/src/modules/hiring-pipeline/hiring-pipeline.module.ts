import { Module } from '@nestjs/common';
import { HiringPipelineRecruiterController } from './api/controllers/hiring-pipeline.recruiter.controller';
import { HiringPipelineRecruiterService } from './api/services/hiring-pipeline.service';

@Module({
  imports: [],
  controllers: [HiringPipelineRecruiterController],
  providers: [HiringPipelineRecruiterService],
})
export class HiringPipelineModule {}
