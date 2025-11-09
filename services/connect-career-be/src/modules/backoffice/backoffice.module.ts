import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../identity/domain/entities';
import { Organization } from '../profile/domain/entities/organization.entity';
import { OrganizationMembership } from '../profile/domain/entities/organization-memberships.entity';
import { Job } from '../jobs/domain/entities/job.entity';
import { Application } from '../applications/domain/entities/application.entity';
import { Interview } from '../applications/domain/entities/interview.entity';
import { Offer } from '../applications/domain/entities/offer.entity';
import { CandidateProfile } from '../profile/domain/entities/candidate-profile.entity';
import { BackofficeController } from './api/controllers/backoffice.controller';
import { BackofficeStatsService } from './api/services/backoffice-stats.service';
import { RecruiterManagementService } from './api/services/recruiter-management.service';
import { OrganizationManagementService } from './api/services/organization-management.service';
import { JobManagementService } from './api/services/job-management.service';
import { CandidateManagementService } from './api/services/candidate-management.service';
import { IdentityModule } from '../identity/identity.module';
import { UserDetailsService } from './api/services/user-details.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Organization,
      OrganizationMembership,
      Job,
      Application,
      Interview,
      Offer,
      CandidateProfile,
    ]),
    IdentityModule,
  ],
  controllers: [BackofficeController],
  providers: [
    BackofficeStatsService,
    RecruiterManagementService,
    OrganizationManagementService,
    JobManagementService,
    CandidateManagementService,
    UserDetailsService,
  ],
  exports: [
    BackofficeStatsService,
    RecruiterManagementService,
    OrganizationManagementService,
    JobManagementService,
    CandidateManagementService,
    UserDetailsService,
  ],
})
export class BackofficeModule {}
