import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  IsArray,
  IsUUID,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from 'src/modules/identity/domain/entities';
import {
  AdminUserResponseDto,
  UserSessionResponseDto,
} from './user.back-office';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Username' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'Username can only contain letters, numbers, underscores, and hyphens',
  })
  username?: string;

  @ApiPropertyOptional({ description: 'First name' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class UserProfileDto {
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

  @ApiProperty({ description: 'Email verification status' })
  emailVerified: boolean;

  @ApiProperty({ description: 'MFA enabled status' })
  mfaEnabled: boolean;

  @ApiProperty({ description: 'Account creation date' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Candidate profile ID' })
  candidateProfileId?: string;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;
}

export class BulkUpdateUserStatusDto {
  @ApiProperty({ description: 'Array of user IDs', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  userIds: string[];

  @ApiProperty({ description: 'New status for all users', enum: UserStatus })
  @IsEnum(UserStatus)
  status: UserStatus;

  @ApiPropertyOptional({ description: 'Reason for bulk status change' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class BulkUpdateUserRolesDto {
  @ApiProperty({ description: 'Array of user IDs', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  userIds: string[];

  @ApiProperty({ description: 'Array of role IDs', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds: string[];

  @ApiPropertyOptional({ description: 'Reason for bulk role change' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UserActivityDto {
  @ApiProperty({ description: 'Activity type' })
  type: string;

  @ApiProperty({ description: 'Activity description' })
  description: string;

  @ApiProperty({ description: 'Activity timestamp' })
  timestamp: Date;

  @ApiProperty({ description: 'IP address' })
  ipAddress?: string;

  @ApiProperty({ description: 'User agent' })
  userAgent?: string;
}

export class UserDetailResponseDto extends AdminUserResponseDto {
  @ApiProperty({ description: 'User activity log', type: [UserActivityDto] })
  activityLog?: UserActivityDto[];

  @ApiProperty({
    description: 'Active sessions',
    type: [UserSessionResponseDto],
  })
  activeSessions?: UserSessionResponseDto[];

  @ApiProperty({ description: 'Total login count' })
  totalLogins: number;

  @ApiProperty({ description: 'Failed login attempts' })
  failedLoginAttempts: number;

  @ApiProperty({ description: 'Account locked until' })
  lockedUntil?: Date;

  @ApiProperty({ description: 'Email verification token' })
  emailVerificationToken?: string;

  @ApiProperty({ description: 'Password reset token' })
  passwordResetToken?: string;
}

export class UserExportDto {
  @ApiProperty({ description: 'Export format', enum: ['csv', 'excel', 'json'] })
  format: 'csv' | 'excel' | 'json';

  @ApiPropertyOptional({ description: 'Date range start' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Date range end' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ description: 'Filter by role' })
  @IsOptional()
  @IsString()
  role?: string;
}
