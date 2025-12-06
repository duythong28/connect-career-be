import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Organization,
  OrganizationLocation,
} from './domain/entities/organization.entity';
import { OrganizationController } from './api/controllers/organization.controller';
import { OrganizationRepository } from './domain/repository/organization.repository';
import { OrganizationService } from './api/services/organization.service';
import { Industry } from './domain/entities/industry.entity';
import { IndustrySeeder } from './infrastructure/seeders/industry.seeder';
import { File } from 'src/shared/infrastructure/external-services/file-system/domain/entities/file.entity';
import { LinkedInPeopleSeeder } from './infrastructure/seeders/linkedin-people.seeder';
import { LinkedInCompanySeeder } from './infrastructure/seeders/linkedin-company.seeder';
import { CandidateProfile } from './domain/entities/candidate-profile.entity';
import { WorkExperience } from './domain/entities/work-experience.entity';
import { Education } from './domain/entities/education.entity';
import { Project } from './domain/entities/project.entity';
import { Certification } from './domain/entities/certification.entity';
import { Award } from './domain/entities/award.entity';
import { Publication } from './domain/entities/publication.entity';
import { User } from '../identity/domain/entities';
import { CandidateProfileController } from './api/controllers/candidate.profile.controller';
import { CandidateProfileService } from './api/services/candidate.profile.service';
import { OrganizationRBACController } from './api/controllers/organization-rbac.controller';
import { OrganizationRBACService } from './api/services/organization-rbac.service';
import {
  OrganizationInvitation,
  OrganizationMembership,
  OrganizationPermission,
  OrganizationRole,
} from './domain/entities/organization-memberships.entity';
import { OrganizationRBACMigrationService } from './infrastructure/organization-rbac-migration.service';
import { Interview } from '../applications/domain/entities/interview.entity';
import { Job } from '../jobs/domain/entities/job.entity';
import { Offer } from '../applications/domain/entities/offer.entity';
import { IndustryController } from './api/controllers/industry.controller';
import { IndustryService } from './api/services/industry.service';
import { Application } from '../applications/domain/entities/application.entity';
import { OrganizationHiringAnalyticsService } from './api/services/organization-hiring-analytics.service';
import { RecruiterDashboardService } from './api/services/recruiter-dashboard.service';
import { OrganizationReviewController } from './api/controllers/organization-review.controller';
import { RecruiterFeedbackController } from './api/controllers/recruiter-review.controller';
import { OrganizationReviewService } from './api/services/organization-review.service';
import { RecruiterFeedbackService } from './api/services/recruiter-feedback.service';
import { OrganizationReview } from './domain/entities/organization-reviews.entity';
import { RecruiterFeedback } from './domain/entities/recruiter-feedbacks.entity';
import { UserPreferences } from '../recommendations/domain/entities/user-preferences.entity';
import { QueueModule } from 'src/shared/infrastructure/queue/queue.module';
import { JobInteraction } from '../recommendations/domain/entities/job-interaction.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Application,
      Interview,
      Offer,
      OrganizationMembership,
      Industry,
      Organization,
      OrganizationLocation,
      Industry,
      File,
      User,
      CandidateProfile,
      WorkExperience,
      Education,
      Industry,
      Project,
      Certification,
      Award,
      Publication,
      OrganizationMembership,
      OrganizationRole,
      OrganizationPermission,
      OrganizationInvitation,
      Interview,
      Job,
      Offer,
      OrganizationReview,
      RecruiterFeedback,
      UserPreferences,
      JobInteraction
    ]),
    QueueModule
  ],
  controllers: [
    OrganizationController,
    CandidateProfileController,
    OrganizationRBACController,
    IndustryController,
    OrganizationReviewController,
    RecruiterFeedbackController,
  ],
  providers: [
    OrganizationRepository,
    OrganizationService,
    CandidateProfileService,
    IndustrySeeder,
    LinkedInCompanySeeder,
    LinkedInPeopleSeeder,
    OrganizationRBACService,
    OrganizationRBACMigrationService,
    IndustryService,
    OrganizationHiringAnalyticsService,
    RecruiterDashboardService,
    OrganizationReviewService,
    RecruiterFeedbackService,
  ],
  exports: [
    OrganizationService,
    OrganizationRepository,
    CandidateProfileService,
    IndustrySeeder,
    LinkedInCompanySeeder,
    LinkedInPeopleSeeder,
    IndustryService,
    RecruiterDashboardService,
    OrganizationReviewService,
    RecruiterFeedbackService,
  ],
})
export class ProfileModule {}
