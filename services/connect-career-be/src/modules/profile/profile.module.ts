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
import { User } from '../identity/domain/entities';

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
    ]),
  ],
  controllers: [OrganizationController],
  providers: [
    OrganizationRepository,
    OrganizationService,
    IndustrySeeder,
    LinkedInCompanySeeder,
    LinkedInPeopleSeeder,
  ],
  exports: [OrganizationService, OrganizationRepository],
})
export class ProfileModule {}
