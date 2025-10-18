import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from './domain/entities/application.entity';
import { Interview } from './domain/entities/interview.entity';
import { Offer } from './domain/entities/offer.entity';
import { Job } from '../jobs/domain/entities/job.entity';
import { User } from '../identity/domain/entities';
import { CandidateProfile } from '../profile/domain/entities/candidate-profile.entity';
import { CV } from '../cv-maker/domain/entities/cv.entity';
import { HiringPipeline } from '../hiring-pipeline/domain/entities/hiring-pipeline.entity';
import { PipelineStage } from '../hiring-pipeline/domain/entities/pipeline-stage.entity';
import { PipelineTransition } from '../hiring-pipeline/domain/entities/pipeline-transition.entity';
import { ApplicationService } from './api/services/application.service';
import { ApplicationStatusService } from './api/services/application-status.service';
import { InterviewService } from './api/services/interview.service';
import { OfferService } from './api/services/offer.service';
import { CommunicationService } from './api/services/communication.service';
import { ApplicationCandidateController } from './api/controller/application.candidate.controller';
import { ApplicationRecruiterController } from './api/controller/application.recruiter.controller';
import { JobStatusService } from '../jobs/api/services/job-status.service';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Application,
      Interview,
      Offer,
      Job,
      User,
      CandidateProfile,
      CV,
      HiringPipeline,
      PipelineStage,
      PipelineTransition,
    ]),
    JobsModule
  ],
  controllers: [ApplicationCandidateController, ApplicationRecruiterController],
  providers: [
    ApplicationService,
    ApplicationStatusService,
    InterviewService,
    OfferService,
    CommunicationService,
    JobStatusService
  ],
  exports: [
    ApplicationService,
    ApplicationStatusService,
    InterviewService,
    OfferService,
    CommunicationService,
  ],
})
export class ApplicationsModule {}
