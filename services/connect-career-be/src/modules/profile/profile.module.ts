import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Organization,
  OrganizationLocation,
} from './domain/entities/organization.entity';
import { OrganizationController } from './api/controllers/organization.controller';
import { OrganizationRepository } from './domain/repository/organization.entity';
import { OrganizationService } from './api/services/organization.service';
import { Industry } from './domain/entities/industry.entity';
import { IndustrySeeder } from './infrastructure/seeders/industry.seeder';
import { File } from 'src/shared/infrastructure/external-services/file-system/domain/entities/file.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Organization, OrganizationLocation, Industry, File])],
  controllers: [OrganizationController],
  providers: [OrganizationRepository, OrganizationService, IndustrySeeder],
  exports: [OrganizationService, OrganizationRepository],
})
export class ProfileModule {}
