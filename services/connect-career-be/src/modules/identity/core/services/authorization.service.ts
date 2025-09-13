import { Injectable, ForbiddenException, NotFoundException, Inject } from '@nestjs/common';
import * as identityRepository from '../../domain/repository/identity.repository';
import { 
  User, 
  Role, 
  Permission, 
  PermissionAction, 
  ResourceType 
} from '../../domain/entities';

export interface PermissionCheck {
  action: PermissionAction;
  resource: ResourceType;
  resourceId?: string;
}

export interface RoleAssignment {
  userId: string;
  roleId: string;
}

@Injectable()
export class AuthorizationService {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: identityRepository.IUserRepository,
    @Inject('IRoleRepository')
    private readonly roleRepository: identityRepository.IRoleRepository,
    @Inject('IPermissionRepository')
    private readonly permissionRepository: identityRepository.IPermissionRepository,
  ) {}

  async checkPermission(userId: string, permission: PermissionCheck): Promise<boolean> {
    const user = await this.userRepository.findWithPermissions(userId);
    if (!user) {
      return false;
    }

    // Check if user has the specific permission
    return user.hasPermission(Permission.createPermissionName(
      permission.action,
      permission.resource,
      permission.resourceId
    ));
  }

  async requirePermission(userId: string, permission: PermissionCheck): Promise<void> {
    const hasPermission = await this.checkPermission(userId, permission);
    if (!hasPermission) {
      throw new ForbiddenException(
        `Access denied. Required permission: ${permission.action}:${permission.resource}${
          permission.resourceId ? `:${permission.resourceId}` : ''
        }`
      );
    }
  }

  async checkRole(userId: string, roleName: string): Promise<boolean> {
    const user = await this.userRepository.findWithRoles(userId);
    if (!user) {
      return false;
    }

    return user.hasRole(roleName);
  }

  async requireRole(userId: string, roleName: string): Promise<void> {
    const hasRole = await this.checkRole(userId, roleName);
    if (!hasRole) {
      throw new ForbiddenException(`Access denied. Required role: ${roleName}`);
    }
  }

  async checkAnyRole(userId: string, roleNames: string[]): Promise<boolean> {
    const user = await this.userRepository.findWithRoles(userId);
    if (!user) {
      return false;
    }

    return roleNames.some(roleName => user.hasRole(roleName));
  }

  async requireAnyRole(userId: string, roleNames: string[]): Promise<void> {
    const hasAnyRole = await this.checkAnyRole(userId, roleNames);
    if (!hasAnyRole) {
      throw new ForbiddenException(`Access denied. Required roles: ${roleNames.join(', ')}`);
    }
  }

  async checkResourceOwnership(userId: string, resourceOwnerId: string): Promise<boolean> {
    return userId === resourceOwnerId;
  }

  async requireResourceOwnership(userId: string, resourceOwnerId: string): Promise<void> {
    const isOwner = await this.checkResourceOwnership(userId, resourceOwnerId);
    if (!isOwner) {
      throw new ForbiddenException('Access denied. You can only access your own resources');
    }
  }

  async checkPermissionOrOwnership(
    userId: string, 
    permission: PermissionCheck, 
    resourceOwnerId: string
  ): Promise<boolean> {
    const hasPermission = await this.checkPermission(userId, permission);
    const isOwner = await this.checkResourceOwnership(userId, resourceOwnerId);
    
    return hasPermission || isOwner;
  }

  async requirePermissionOrOwnership(
    userId: string, 
    permission: PermissionCheck, 
    resourceOwnerId: string
  ): Promise<void> {
    const hasAccess = await this.checkPermissionOrOwnership(userId, permission, resourceOwnerId);
    if (!hasAccess) {
      throw new ForbiddenException(
        'Access denied. You need permission or resource ownership'
      );
    }
  }

  // Role Management
  async assignRole(assignment: RoleAssignment): Promise<void> {
    const user = await this.userRepository.findWithRoles(assignment.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const role = await this.roleRepository.findById(assignment.roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (!user.hasRole(role.name)) {
      if (!user.roles) {
        user.roles = [];
      }
      user.roles.push(role);
      await this.userRepository.update(user.id, user);
    }
  }

  async removeRole(assignment: RoleAssignment): Promise<void> {
    const user = await this.userRepository.findWithRoles(assignment.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const role = await this.roleRepository.findById(assignment.roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (user.roles) {
      user.roles = user.roles.filter(r => r.id !== role.id);
      await this.userRepository.update(user.id, user);
    }
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    return this.roleRepository.findByUserId(userId);
  }

  async getUserPermissions(userId: string): Promise<Permission[]> {
    return this.permissionRepository.findByUserId(userId);
  }

  // Role Management (Admin functions)
  async createRole(roleData: {
    name: string;
    description?: string;
    permissionIds?: string[];
  }): Promise<Role> {
    const existingRole = await this.roleRepository.findByName(roleData.name);
    if (existingRole) {
      throw new ForbiddenException('Role with this name already exists');
    }

    const role = await this.roleRepository.create({
      name: roleData.name,
      description: roleData.description,
    });

    if (roleData.permissionIds && roleData.permissionIds.length > 0) {
      await this.assignPermissionsToRole(role.id, roleData.permissionIds);
    }

    return role;
  }

  async updateRole(roleId: string, updates: {
    name?: string;
    description?: string;
    isActive?: boolean;
  }): Promise<Role> {
    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (updates.name && updates.name !== role.name) {
      const existingRole = await this.roleRepository.findByName(updates.name);
      if (existingRole) {
        throw new ForbiddenException('Role with this name already exists');
      }
    }

    return this.roleRepository.update(roleId, updates);
  }

  async deleteRole(roleId: string): Promise<void> {
    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystemRole) {
      throw new ForbiddenException('Cannot delete system roles');
    }

    await this.roleRepository.delete(roleId);
  }

  async assignPermissionsToRole(roleId: string, permissionIds: string[]): Promise<void> {
    const role = await this.roleRepository.findWithPermissions(roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    for (const permissionId of permissionIds) {
      const permission = await this.permissionRepository.findById(permissionId);
      if (permission) {
        role.addPermission(permission);
      }
    }

    await this.roleRepository.update(roleId, role);
  }

  async removePermissionsFromRole(roleId: string, permissionIds: string[]): Promise<void> {
    const role = await this.roleRepository.findWithPermissions(roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    for (const permissionId of permissionIds) {
      const permission = await this.permissionRepository.findById(permissionId);
      if (permission) {
        role.removePermission(permission.name);
      }
    }

    await this.roleRepository.update(roleId, role);
  }

  // Permission Management
  async createPermission(permissionData: {
    name: string;
    description?: string;
    action: PermissionAction;
    resource: ResourceType;
    resourceId?: string;
  }): Promise<Permission> {
    const existingPermission = await this.permissionRepository.findByName(permissionData.name);
    if (existingPermission) {
      throw new ForbiddenException('Permission with this name already exists');
    }

    return this.permissionRepository.create(permissionData);
  }

  async updatePermission(permissionId: string, updates: {
    name?: string;
    description?: string;
    isActive?: boolean;
  }): Promise<Permission> {
    const permission = await this.permissionRepository.findById(permissionId);
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    if (updates.name && updates.name !== permission.name) {
      const existingPermission = await this.permissionRepository.findByName(updates.name);
      if (existingPermission) {
        throw new ForbiddenException('Permission with this name already exists');
      }
    }

    return this.permissionRepository.update(permissionId, updates);
  }

  async deletePermission(permissionId: string): Promise<void> {
    const permission = await this.permissionRepository.findById(permissionId);
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    if (permission.isSystemPermission) {
      throw new ForbiddenException('Cannot delete system permissions');
    }

    await this.permissionRepository.delete(permissionId);
  }

  // Utility methods for common permission patterns
  async canManageUsers(userId: string): Promise<boolean> {
    return this.checkPermission(userId, {
      action: PermissionAction.MANAGE,
      resource: ResourceType.USER,
    });
  }

  async canManageRoles(userId: string): Promise<boolean> {
    return this.checkPermission(userId, {
      action: PermissionAction.MANAGE,
      resource: ResourceType.ROLE,
    });
  }

  async canReadResource(userId: string, resource: ResourceType, resourceId?: string): Promise<boolean> {
    return this.checkPermission(userId, {
      action: PermissionAction.READ,
      resource,
      resourceId,
    });
  }

  async canWriteResource(userId: string, resource: ResourceType, resourceId?: string): Promise<boolean> {
    return this.checkPermission(userId, {
      action: PermissionAction.UPDATE,
      resource,
      resourceId,
    });
  }

  async canDeleteResource(userId: string, resource: ResourceType, resourceId?: string): Promise<boolean> {
    return this.checkPermission(userId, {
      action: PermissionAction.DELETE,
      resource,
      resourceId,
    });
  }
}
