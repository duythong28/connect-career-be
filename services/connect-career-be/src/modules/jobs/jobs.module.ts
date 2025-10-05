import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from './domain/entities/job.entity';
import { LinkedInJobsSeeder } from './infrastructure/seeders/linkedin-jobs.seeder';
import { Organization } from '../profile/domain/entities/organization.entity';
import { User, Role } from '../identity/domain/entities';
import { Industry } from '../profile/domain/entities/industry.entity';
import { File } from 'src/shared/infrastructure/external-services/file-system/domain/entities/file.entity';
import { JobController } from './api/controllers/job.controller';
import { JobService } from './api/services/job.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, Organization, User, Role, Industry, File]),
  ],
  controllers: [JobController],
  providers: [JobService, LinkedInJobsSeeder],
  exports: [JobService, LinkedInJobsSeeder],
})
export class JobsModule {}
