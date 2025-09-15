import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionAction, ResourceType } from '../../domain/entities';

export class CreateRoleDto {
  @ApiProperty({ description: 'Role name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Role description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Permission IDs to assign to role',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds?: string[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional({ description: 'Role name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Role description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Role active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AssignRoleDto {
  @ApiProperty({ description: 'User ID' })
  @IsUUID('4')
  userId: string;

  @ApiProperty({ description: 'Role ID' })
  @IsUUID('4')
  roleId: string;
}

export class CreatePermissionDto {
  @ApiProperty({ description: 'Permission name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Permission description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Permission action', enum: PermissionAction })
  @IsEnum(PermissionAction)
  action: PermissionAction;

  @ApiProperty({ description: 'Resource type', enum: ResourceType })
  @IsEnum(ResourceType)
  resource: ResourceType;

  @ApiPropertyOptional({
    description: 'Specific resource ID for resource-level permissions',
  })
  @IsOptional()
  @IsString()
  resourceId?: string;
}

export class UpdatePermissionDto {
  @ApiPropertyOptional({ description: 'Permission name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Permission description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Permission active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AssignPermissionsToRoleDto {
  @ApiProperty({ description: 'Permission IDs to assign', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds: string[];
}

export class RoleResponseDto {
  @ApiProperty({ description: 'Role ID' })
  id: string;

  @ApiProperty({ description: 'Role name' })
  name: string;

  @ApiPropertyOptional({ description: 'Role description' })
  description?: string;

  @ApiProperty({ description: 'Role active status' })
  isActive: boolean;

  @ApiProperty({ description: 'System role flag' })
  isSystemRole: boolean;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Update date' })
  updatedAt: Date;
}

export class PermissionResponseDto {
  @ApiProperty({ description: 'Permission ID' })
  id: string;

  @ApiProperty({ description: 'Permission name' })
  name: string;

  @ApiPropertyOptional({ description: 'Permission description' })
  description?: string;

  @ApiProperty({ description: 'Permission action', enum: PermissionAction })
  action: PermissionAction;

  @ApiProperty({ description: 'Resource type', enum: ResourceType })
  resource: ResourceType;

  @ApiPropertyOptional({ description: 'Specific resource ID' })
  resourceId?: string;

  @ApiProperty({ description: 'Permission active status' })
  isActive: boolean;

  @ApiProperty({ description: 'System permission flag' })
  isSystemPermission: boolean;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Update date' })
  updatedAt: Date;
}

export class RoleWithPermissionsDto extends RoleResponseDto {
  @ApiProperty({
    description: 'Role permissions',
    type: [PermissionResponseDto],
  })
  permissions: PermissionResponseDto[];
}

export class UserRolesResponseDto {
  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'User roles', type: [RoleResponseDto] })
  roles: RoleResponseDto[];
}

export class UserPermissionsResponseDto {
  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({
    description: 'User permissions',
    type: [PermissionResponseDto],
  })
  permissions: PermissionResponseDto[];
}
