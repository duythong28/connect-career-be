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
      File,
      Application,
    ]),
  ],
  controllers: [JobCandidateController, JobOrganizationController],
  providers: [JobService, SavedJobService, LinkedInJobsSeeder],
  exports: [JobService, SavedJobService, LinkedInJobsSeeder],
})
export class JobsModule {}
