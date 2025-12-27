import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsEnum, IsArray, IsUUID } from 'class-validator';
import { UserStatus } from 'src/modules/identity/domain/entities/user.entity';

export class AdminUserListQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @Type(() => Number)
  pageSize?: number = 10;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by user status',
    enum: UserStatus,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ description: 'Filter by role name' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ description: 'Sort by field', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class UpdateUserStatusDto {
  @ApiProperty({ description: 'New user status', enum: UserStatus })
  @IsEnum(UserStatus)
  status: UserStatus;
}

export class UpdateUserRolesDto {
  @ApiProperty({ description: 'Array of role IDs', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds: string[];
}

export class AdminUserResponseDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'Email address' })
  email: string;

  @ApiPropertyOptional({ description: 'Username' })
  username?: string;

  @ApiPropertyOptional({ description: 'First name' })
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  lastName?: string;

  @ApiPropertyOptional({ description: 'Full name' })
  fullName?: string;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  phoneNumber?: string;

  @ApiProperty({ description: 'User status', enum: UserStatus })
  status: UserStatus;

  @ApiProperty({ description: 'Email verification status' })
  emailVerified: boolean;

  @ApiProperty({ description: 'MFA enabled status' })
  mfaEnabled: boolean;

  @ApiProperty({ description: 'Last login date' })
  lastLoginAt?: Date;

  @ApiProperty({ description: 'Account creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Candidate profile ID' })
  candidateProfileId?: string;

  @ApiProperty({ description: 'User roles', type: [Object] })
  roles: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
}

export class UserStatsResponseDto {
  @ApiProperty({ description: 'Total users' })
  total: number;

  @ApiProperty({ description: 'Active users' })
  active: number;

  @ApiProperty({ description: 'Inactive users' })
  inactive: number;

  @ApiProperty({ description: 'Suspended users' })
  suspended: number;

  @ApiProperty({ description: 'Pending verification users' })
  pendingVerification: number;

  @ApiProperty({ description: 'Users by role', type: [Object] })
  byRole: Array<{
    role: string;
    count: number;
  }>;
}

export class UserSessionResponseDto {
  @ApiProperty({ description: 'Session ID' })
  id: string;

  @ApiProperty({ description: 'Session status' })
  status: string;

  @ApiProperty({ description: 'IP address' })
  ipAddress?: string;

  @ApiProperty({ description: 'User agent' })
  userAgent?: string;

  @ApiProperty({ description: 'Device name' })
  deviceName?: string;

  @ApiProperty({ description: 'Location' })
  location?: string;

  @ApiProperty({ description: 'Is mobile device' })
  isMobile: boolean;

  @ApiProperty({ description: 'Last activity date' })
  lastActivityAt?: Date;

  @ApiProperty({ description: 'Session creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Session expiration date' })
  expiresAt: Date;
}

export class RevokeSessionsResponseDto {
  @ApiProperty({ description: 'Number of sessions revoked' })
  revokedCount: number;

  @ApiProperty({ description: 'Success message' })
  message: string;
}
