import { IsOptional, IsString, IsBoolean, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Organization } from 'src/modules/profile/domain/entities/organization.entity';

export class OrganizationListQueryDto {
  @ApiPropertyOptional({ description: 'Search by name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by verification status' })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  limit?: number;
}

export class UpdateOrganizationStatusDto {
  @ApiPropertyOptional({ description: 'Set verification status' })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({ description: 'Set active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export interface OrganizationResponse {
  organization: Organization;
  stats: {
    totalJobs: number;
    activeJobs: number;
    totalApplications: number;
    totalHires: number;
    totalMembers: number;
    totalRecruiters: number;
  };
}
