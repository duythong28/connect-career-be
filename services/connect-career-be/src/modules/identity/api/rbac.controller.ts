import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthorizationService } from '../core/services/authorization.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { Roles } from './decorators/roles.decorator';
import { RequirePermissions } from './decorators/permissions.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { PermissionAction, ResourceType } from '../domain/entities';
import {
  CreateRoleDto,
  UpdateRoleDto,
  AssignRoleDto,
  CreatePermissionDto,
  UpdatePermissionDto,
  AssignPermissionsToRoleDto,
  RoleResponseDto,
  PermissionResponseDto,
  RoleWithPermissionsDto,
  UserRolesResponseDto,
  UserPermissionsResponseDto
} from './dtos';

@ApiTags('RBAC - Roles & Permissions')
@Controller('rbac')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class RbacController {
  constructor(
    private readonly authorizationService: AuthorizationService,
  ) {}

  // Role Management
  @Get('roles')
  @Roles('admin', 'role_manager')
  @ApiOperation({ summary: 'Get all roles' })
  @ApiResponse({ status: 200, description: 'Roles retrieved successfully', type: [RoleResponseDto] })
  async getRoles(): Promise<RoleResponseDto[]> {
    // Implementation would fetch all roles
    return [];
  }

  @Get('roles/:id')
  @Roles('admin', 'role_manager')
  @ApiOperation({ summary: 'Get role by ID with permissions' })
  @ApiResponse({ status: 200, description: 'Role retrieved successfully', type: RoleWithPermissionsDto })
  async getRoleById(@Param('id') id: string): Promise<RoleWithPermissionsDto> {
    // Implementation would fetch role with permissions
    return {} as RoleWithPermissionsDto;
  }

  @Post('roles')
  @RequirePermissions({ action: PermissionAction.CREATE, resource: ResourceType.ROLE })
  @ApiOperation({ summary: 'Create new role' })
  @ApiResponse({ status: 201, description: 'Role created successfully', type: RoleResponseDto })
  async createRole(@Body() createRoleDto: CreateRoleDto): Promise<RoleResponseDto> {
    const role = await this.authorizationService.createRole(createRoleDto);
    return role as RoleResponseDto;
  }

  @Put('roles/:id')
  @RequirePermissions({ action: PermissionAction.UPDATE, resource: ResourceType.ROLE })
  @ApiOperation({ summary: 'Update role' })
  @ApiResponse({ status: 200, description: 'Role updated successfully', type: RoleResponseDto })
  async updateRole(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto
  ): Promise<RoleResponseDto> {
    const role = await this.authorizationService.updateRole(id, updateRoleDto);
    return role as RoleResponseDto;
  }

  @Delete('roles/:id')
  @RequirePermissions({ action: PermissionAction.DELETE, resource: ResourceType.ROLE })
  @ApiOperation({ summary: 'Delete role' })
  @ApiResponse({ status: 200, description: 'Role deleted successfully' })
  async deleteRole(@Param('id') id: string): Promise<{ message: string }> {
    await this.authorizationService.deleteRole(id);
    return { message: 'Role deleted successfully' };
  }

  // Permission Management
  @Get('permissions')
  @Roles('admin', 'role_manager')
  @ApiOperation({ summary: 'Get all permissions' })
  @ApiResponse({ status: 200, description: 'Permissions retrieved successfully', type: [PermissionResponseDto] })
  async getPermissions(): Promise<PermissionResponseDto[]> {
    // Implementation would fetch all permissions
    return [];
  }

  @Post('permissions')
  @RequirePermissions({ action: PermissionAction.CREATE, resource: ResourceType.PERMISSION })
  @ApiOperation({ summary: 'Create new permission' })
  @ApiResponse({ status: 201, description: 'Permission created successfully', type: PermissionResponseDto })
  async createPermission(@Body() createPermissionDto: CreatePermissionDto): Promise<PermissionResponseDto> {
    const permission = await this.authorizationService.createPermission(createPermissionDto);
    return permission as PermissionResponseDto;
  }

  @Put('permissions/:id')
  @RequirePermissions({ action: PermissionAction.UPDATE, resource: ResourceType.PERMISSION })
  @ApiOperation({ summary: 'Update permission' })
  @ApiResponse({ status: 200, description: 'Permission updated successfully', type: PermissionResponseDto })
  async updatePermission(
    @Param('id') id: string,
    @Body() updatePermissionDto: UpdatePermissionDto
  ): Promise<PermissionResponseDto> {
    const permission = await this.authorizationService.updatePermission(id, updatePermissionDto);
    return permission as PermissionResponseDto;
  }

  @Delete('permissions/:id')
  @RequirePermissions({ action: PermissionAction.DELETE, resource: ResourceType.PERMISSION })
  @ApiOperation({ summary: 'Delete permission' })
  @ApiResponse({ status: 200, description: 'Permission deleted successfully' })
  async deletePermission(@Param('id') id: string): Promise<{ message: string }> {
    await this.authorizationService.deletePermission(id);
    return { message: 'Permission deleted successfully' };
  }

  // Role-Permission Assignment
  @Post('roles/:roleId/permissions')
  @RequirePermissions({ action: PermissionAction.UPDATE, resource: ResourceType.ROLE })
  @ApiOperation({ summary: 'Assign permissions to role' })
  @ApiResponse({ status: 200, description: 'Permissions assigned successfully' })
  async assignPermissionsToRole(
    @Param('roleId') roleId: string,
    @Body() assignPermissionsDto: AssignPermissionsToRoleDto
  ): Promise<{ message: string }> {
    await this.authorizationService.assignPermissionsToRole(roleId, assignPermissionsDto.permissionIds);
    return { message: 'Permissions assigned successfully' };
  }

  @Delete('roles/:roleId/permissions')
  @RequirePermissions({ action: PermissionAction.UPDATE, resource: ResourceType.ROLE })
  @ApiOperation({ summary: 'Remove permissions from role' })
  @ApiResponse({ status: 200, description: 'Permissions removed successfully' })
  async removePermissionsFromRole(
    @Param('roleId') roleId: string,
    @Body() assignPermissionsDto: AssignPermissionsToRoleDto
  ): Promise<{ message: string }> {
    await this.authorizationService.removePermissionsFromRole(roleId, assignPermissionsDto.permissionIds);
    return { message: 'Permissions removed successfully' };
  }

  // User-Role Assignment
  @Post('users/roles/assign')
  @RequirePermissions({ action: PermissionAction.UPDATE, resource: ResourceType.USER })
  @ApiOperation({ summary: 'Assign role to user' })
  @ApiResponse({ status: 200, description: 'Role assigned successfully' })
  async assignRoleToUser(@Body() assignRoleDto: AssignRoleDto): Promise<{ message: string }> {
    await this.authorizationService.assignRole(assignRoleDto);
    return { message: 'Role assigned successfully' };
  }

  @Post('users/roles/remove')
  @RequirePermissions({ action: PermissionAction.UPDATE, resource: ResourceType.USER })
  @ApiOperation({ summary: 'Remove role from user' })
  @ApiResponse({ status: 200, description: 'Role removed successfully' })
  async removeRoleFromUser(@Body() assignRoleDto: AssignRoleDto): Promise<{ message: string }> {
    await this.authorizationService.removeRole(assignRoleDto);
    return { message: 'Role removed successfully' };
  }

  // User Role/Permission Queries
  @Get('users/:userId/roles')
  @RequirePermissions({ action: PermissionAction.READ, resource: ResourceType.USER })
  @ApiOperation({ summary: 'Get user roles' })
  @ApiResponse({ status: 200, description: 'User roles retrieved successfully', type: UserRolesResponseDto })
  async getUserRoles(@Param('userId') userId: string): Promise<UserRolesResponseDto> {
    const roles = await this.authorizationService.getUserRoles(userId);
    return {
      userId,
      roles: roles as RoleResponseDto[]
    };
  }

  @Get('users/:userId/permissions')
  @RequirePermissions({ action: PermissionAction.READ, resource: ResourceType.USER })
  @ApiOperation({ summary: 'Get user permissions' })
  @ApiResponse({ status: 200, description: 'User permissions retrieved successfully', type: UserPermissionsResponseDto })
  async getUserPermissions(@Param('userId') userId: string): Promise<UserPermissionsResponseDto> {
    const permissions = await this.authorizationService.getUserPermissions(userId);
    return {
      userId,
      permissions: permissions as PermissionResponseDto[]
    };
  }

  @Get('my-roles')
  @ApiOperation({ summary: 'Get current user roles' })
  @ApiResponse({ status: 200, description: 'Current user roles retrieved successfully', type: UserRolesResponseDto })
  async getMyRoles(@CurrentUser() user: any): Promise<UserRolesResponseDto> {
    const roles = await this.authorizationService.getUserRoles(user.sub);
    return {
      userId: user.sub,
      roles: roles as RoleResponseDto[]
    };
  }

  @Get('my-permissions')
  @ApiOperation({ summary: 'Get current user permissions' })
  @ApiResponse({ status: 200, description: 'Current user permissions retrieved successfully', type: UserPermissionsResponseDto })
  async getMyPermissions(@CurrentUser() user: any): Promise<UserPermissionsResponseDto> {
    const permissions = await this.authorizationService.getUserPermissions(user.sub);
    return {
      userId: user.sub,
      permissions: permissions as PermissionResponseDto[]
    };
  }
}
