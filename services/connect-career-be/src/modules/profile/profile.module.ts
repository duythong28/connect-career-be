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

@Module({
  imports: [
    TypeOrmModule.forFeature([
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
    ]),
  ],
  controllers: [
    OrganizationController,
    CandidateProfileController,
    OrganizationRBACController,
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
  ],
  exports: [
    OrganizationService,
    OrganizationRepository,
    CandidateProfileService,
    IndustrySeeder,
    LinkedInCompanySeeder,
    LinkedInPeopleSeeder,
  ],
})
export class ProfileModule {}
