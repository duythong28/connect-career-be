import {
    IsOptional,
    IsString,
    IsEnum,
    IsUUID,
    IsBoolean,
    IsEmail,
  } from 'class-validator';
  import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
  import { UserStatus } from 'src/modules/identity/domain/entities/user.entity';
  
  export class UserListQueryDto {
    @ApiPropertyOptional({ description: 'Search by name, email, or username' })
    @IsOptional()
    @IsString()
    search?: string;
  
    @ApiPropertyOptional({
      description: 'Filter by status',
      enum: UserStatus,
    })
    @IsOptional()
    @IsEnum(UserStatus)
    status?: UserStatus;
  
    @ApiPropertyOptional({ description: 'Filter by role ID' })
    @IsOptional()
    @IsUUID()
    roleId?: string;
  
    @ApiPropertyOptional({ description: 'Filter by email verified status' })
    @IsOptional()
    @IsBoolean()
    emailVerified?: boolean;
  
    @ApiPropertyOptional({ description: 'Page number', default: 1 })
    @IsOptional()
    page?: number;
  
    @ApiPropertyOptional({ description: 'Items per page', default: 20 })
    @IsOptional()
    limit?: number;
  }
  
  export class UpdateUserDto {
    @ApiPropertyOptional({ description: 'Update user status' })
    @IsOptional()
    @IsEnum(UserStatus)
    status?: UserStatus;
  
    @ApiPropertyOptional({ description: 'Update email' })
    @IsOptional()
    @IsEmail()
    email?: string;
  
    @ApiPropertyOptional({ description: 'Update first name' })
    @IsOptional()
    @IsString()
    firstName?: string;
  
    @ApiPropertyOptional({ description: 'Update last name' })
    @IsOptional()
    @IsString()
    lastName?: string;
  
    @ApiPropertyOptional({ description: 'Update phone number' })
    @IsOptional()
    @IsString()
    phoneNumber?: string;
  
    @ApiPropertyOptional({ description: 'Mark email as verified' })
    @IsOptional()
    @IsBoolean()
    emailVerified?: boolean;
  }
  
  export class UpdateUserStatusDto {
    @ApiProperty({ description: 'User status', enum: UserStatus })
    @IsEnum(UserStatus)
    status: UserStatus;
  }
  
  export interface UserResponse {
    id: string;
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    phoneNumber?: string;
    status: UserStatus;
    emailVerified: boolean;
    authProvider: string;
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    roles?: Array<{
      id: string;
      name: string;
      description?: string;
    }>;
    stats?: {
      totalApplications?: number;
      totalJobsPosted?: number;
      totalOrganizations?: number;
    };
  }