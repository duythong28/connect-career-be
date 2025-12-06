import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from './domain/entities/job.entity';
import { LinkedInJobsSeeder } from './infrastructure/seeders/linkedin-jobs.seeder';
import { Organization } from '../profile/domain/entities/organization.entity';
import { User, Role } from '../identity/domain/entities';
import { Industry } from '../profile/domain/entities/industry.entity';
import { File } from 'src/shared/infrastructure/external-services/file-system/domain/entities/file.entity';
import { JobService } from './api/services/job.service';
import { SavedJob } from './domain/entities/saved-job.entity';
import { FavoriteJob } from './domain/entities/favorite-job.entity';
import { SavedJobService } from './api/services/saved-job.service';
import { Application } from '../applications/domain/entities/application.entity';
import { JobCandidateController } from './api/controllers/job.candidate.controller';
import { JobOrganizationController } from './api/controllers/job.organization.controller';
import { JobStateMachineFactory } from './domain/state-machine/job-state-machine.factory';
import { ActiveStateStrategy } from './domain/state-machine/strategies/active-state.strategy';
import { PausedStateStrategy } from './domain/state-machine/strategies/paused-state.strategy';
import { ClosedStateStrategy } from './domain/state-machine/strategies/closed-state.strategy';
import { ExpiredStateStrategy } from './domain/state-machine/strategies/expired-state.strategy';
import { CancelledStateStrategy } from './domain/state-machine/strategies/cancelled-state.strategy';
import { ArchivedStateStrategy } from './domain/state-machine/strategies/archived-state.strategy';
import { HiringPipeline } from '../hiring-pipeline/domain/entities/hiring-pipeline.entity';
import { QueueModule } from 'src/shared/infrastructure/queue/queue.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Job,
      SavedJob,
      FavoriteJob,
      Organization,
      User,
      Role,
      Industry,
      HiringPipeline,
      File,
      Application,
    ]),
    QueueModule
  ],
  controllers: [JobCandidateController, JobOrganizationController],
  providers: [
    JobService,
    SavedJobService,
    LinkedInJobsSeeder,
    JobStateMachineFactory,
    ActiveStateStrategy,
    PausedStateStrategy,
    ClosedStateStrategy,
    ExpiredStateStrategy,
    CancelledStateStrategy,
    ArchivedStateStrategy,
  ],
  exports: [
    JobService,
    SavedJobService,
    LinkedInJobsSeeder,
    JobStateMachineFactory,
  ],
})
export class JobsModule {}
