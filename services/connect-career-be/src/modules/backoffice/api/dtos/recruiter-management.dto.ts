import {
  IsOptional,
  IsString,
  IsEnum,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { MembershipStatus } from 'src/modules/profile/domain/entities/organization-memberships.entity';

export class RecruiterListQueryDto {
  @ApiPropertyOptional({ description: 'Search by name or email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by organization ID' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: MembershipStatus,
  })
  @IsOptional()
  @IsEnum(MembershipStatus)
  status?: MembershipStatus;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  limit?: number;
}

export class UpdateRecruiterDto {
  @ApiPropertyOptional({ description: 'Update recruiter status' })
  @IsOptional()
  @IsEnum(MembershipStatus)
  status?: MembershipStatus;

  @ApiPropertyOptional({ description: 'Update role ID' })
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiPropertyOptional({ description: 'Remove from organization' })
  @IsOptional()
  @IsBoolean()
  removeFromOrganization?: boolean;
}

export class AssignRecruiterToOrganizationDto {
  @ApiProperty({ description: 'Organization ID' })
  @IsUUID()
  organizationId: string;

  @ApiProperty({ description: 'Role ID' })
  @IsUUID()
  roleId: string;
}

export interface RecruiterResponse {
  id: string;
  userId: string;
  name: string;
  email: string;
  status: MembershipStatus;
  role: {
    id: string;
    name: string;
    description?: string;
  };
  organization: {
    id: string;
    name: string;
  };
  joinedAt?: Date;
  createdAt: Date;
  lastLoginAt?: Date;
  stats: {
    totalJobs: number;
    totalApplications: number;
    totalHires: number;
    activeOrganizations: number;
  };
}
