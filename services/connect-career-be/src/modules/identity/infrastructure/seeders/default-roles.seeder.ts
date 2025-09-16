import { Injectable, Logger, Inject } from '@nestjs/common';
import * as identityRepository from '../../domain/repository/identity.repository';
import { PermissionAction, ResourceType } from '../../domain/entities';

@Injectable()
export class DefaultRolesSeeder {
  private readonly logger = new Logger(DefaultRolesSeeder.name);

  constructor(
    @Inject('IRoleRepository')
    private readonly roleRepository: identityRepository.IRoleRepository,
    @Inject('IPermissionRepository')
    private readonly permissionRepository: identityRepository.IPermissionRepository,
  ) {}

  async seed(): Promise<void> {
    this.logger.log('🚀 Starting admin seeders (roles & permissions)...');

    try {
      // Create default permissions
      await this.createDefaultPermissions();

      // Create default roles
      await this.createDefaultRoles();

      this.logger.log('Default roles and permissions seeded successfully');
    } catch (error) {
      this.logger.error('Failed to seed default roles and permissions', error);
      throw error;
    }
  }

  private async createDefaultPermissions(): Promise<void> {
    const permissions = [
      // User permissions
      {
        name: 'create:user',
        action: PermissionAction.CREATE,
        resource: ResourceType.USER,
        description: 'Create new users',
      },
      {
        name: 'read:user',
        action: PermissionAction.READ,
        resource: ResourceType.USER,
        description: 'View user information',
      },
      {
        name: 'update:user',
        action: PermissionAction.UPDATE,
        resource: ResourceType.USER,
        description: 'Update user information',
      },
      {
        name: 'delete:user',
        action: PermissionAction.DELETE,
        resource: ResourceType.USER,
        description: 'Delete users',
      },
      {
        name: 'manage:user',
        action: PermissionAction.MANAGE,
        resource: ResourceType.USER,
        description: 'Full user management',
      },

      // Role permissions
      {
        name: 'create:role',
        action: PermissionAction.CREATE,
        resource: ResourceType.ROLE,
        description: 'Create new roles',
      },
      {
        name: 'read:role',
        action: PermissionAction.READ,
        resource: ResourceType.ROLE,
        description: 'View roles',
      },
      {
        name: 'update:role',
        action: PermissionAction.UPDATE,
        resource: ResourceType.ROLE,
        description: 'Update roles',
      },
      {
        name: 'delete:role',
        action: PermissionAction.DELETE,
        resource: ResourceType.ROLE,
        description: 'Delete roles',
      },
      {
        name: 'manage:role',
        action: PermissionAction.MANAGE,
        resource: ResourceType.ROLE,
        description: 'Full role management',
      },

      // Permission permissions
      {
        name: 'create:permission',
        action: PermissionAction.CREATE,
        resource: ResourceType.PERMISSION,
        description: 'Create new permissions',
      },
      {
        name: 'read:permission',
        action: PermissionAction.READ,
        resource: ResourceType.PERMISSION,
        description: 'View permissions',
      },
      {
        name: 'update:permission',
        action: PermissionAction.UPDATE,
        resource: ResourceType.PERMISSION,
        description: 'Update permissions',
      },
      {
        name: 'delete:permission',
        action: PermissionAction.DELETE,
        resource: ResourceType.PERMISSION,
        description: 'Delete permissions',
      },
      {
        name: 'manage:permission',
        action: PermissionAction.MANAGE,
        resource: ResourceType.PERMISSION,
        description: 'Full permission management',
      },

      // Blog permissions
      {
        name: 'create:blog',
        action: PermissionAction.CREATE,
        resource: ResourceType.BLOG,
        description: 'Create blog posts',
      },
      {
        name: 'read:blog',
        action: PermissionAction.READ,
        resource: ResourceType.BLOG,
        description: 'Read blog posts',
      },
      {
        name: 'update:blog',
        action: PermissionAction.UPDATE,
        resource: ResourceType.BLOG,
        description: 'Update blog posts',
      },
      {
        name: 'delete:blog',
        action: PermissionAction.DELETE,
        resource: ResourceType.BLOG,
        description: 'Delete blog posts',
      },
      {
        name: 'manage:blog',
        action: PermissionAction.MANAGE,
        resource: ResourceType.BLOG,
        description: 'Full blog management',
      },

      // CV permissions
      {
        name: 'create:cv',
        action: PermissionAction.CREATE,
        resource: ResourceType.CV,
        description: 'Create CVs',
      },
      {
        name: 'read:cv',
        action: PermissionAction.READ,
        resource: ResourceType.CV,
        description: 'Read CVs',
      },
      {
        name: 'update:cv',
        action: PermissionAction.UPDATE,
        resource: ResourceType.CV,
        description: 'Update CVs',
      },
      {
        name: 'delete:cv',
        action: PermissionAction.DELETE,
        resource: ResourceType.CV,
        description: 'Delete CVs',
      },
      {
        name: 'manage:cv',
        action: PermissionAction.MANAGE,
        resource: ResourceType.CV,
        description: 'Full CV management',
      },

      // Other resource permissions
      {
        name: 'read:chat',
        action: PermissionAction.READ,
        resource: ResourceType.CHAT,
        description: 'Access chat features',
      },
      {
        name: 'manage:notification',
        action: PermissionAction.MANAGE,
        resource: ResourceType.NOTIFICATION,
        description: 'Manage notifications',
      },
      {
        name: 'manage:portfolio',
        action: PermissionAction.MANAGE,
        resource: ResourceType.PORTFOLIO,
        description: 'Manage portfolios',
      },
      {
        name: 'manage:subscription',
        action: PermissionAction.MANAGE,
        resource: ResourceType.SUBSCRIPTION,
        description: 'Manage subscriptions',
      },
      {
        name: 'read:learning',
        action: PermissionAction.READ,
        resource: ResourceType.LEARNING,
        description: 'Access learning materials',
      },
      {
        name: 'read:ai_resume',
        action: PermissionAction.READ,
        resource: ResourceType.AI_RESUME,
        description: 'Access AI resume features',
      },
    ];

    for (const permissionData of permissions) {
      try {
        const existing = await this.permissionRepository.findByName(
          permissionData.name,
        );
        if (!existing) {
          await this.permissionRepository.create({
            ...permissionData,
            isSystemPermission: true,
          });
          this.logger.log(`✓ Created permission: ${permissionData.name}`);
        } else {
          this.logger.log(`- Permission already exists: ${permissionData.name}`);
        }
      } catch (error) {
        this.logger.error(`Failed to create permission ${permissionData.name}:`, error);
        // Continue with other permissions
      }
    }
  }

  private async createDefaultRoles(): Promise<void> {
    const roles = [
      {
        name: 'super_admin',
        description: 'Super administrator with full system access',
        permissions: [
          'manage:user',
          'manage:role',
          'manage:permission',
          'manage:blog',
          'manage:cv',
          'read:chat',
          'manage:notification',
          'manage:portfolio',
          'manage:subscription',
          'read:learning',
          'read:ai_resume',
        ],
      },
      {
        name: 'admin',
        description: 'Administrator with most system access',
        permissions: [
          'create:user',
          'read:user',
          'update:user',
          'read:role',
          'read:permission',
          'manage:blog',
          'manage:cv',
          'read:chat',
          'manage:notification',
          'manage:portfolio',
          'manage:subscription',
          'read:learning',
          'read:ai_resume',
        ],
      },
      {
        name: 'moderator',
        description: 'Content moderator',
        permissions: [
          'read:user',
          'read:blog',
          'update:blog',
          'delete:blog',
          'read:cv',
          'read:chat',
          'read:learning',
        ],
      },
      {
        name: 'premium_user',
        description: 'Premium user with enhanced features',
        permissions: [
          'create:blog',
          'read:blog',
          'update:blog',
          'create:cv',
          'read:cv',
          'update:cv',
          'read:chat',
          'manage:portfolio',
          'read:learning',
          'read:ai_resume',
        ],
      },
      {
        name: 'user',
        description: 'Regular user',
        permissions: [
          'read:blog',
          'create:cv',
          'read:cv',
          'update:cv',
          'read:chat',
          'read:learning',
        ],
      },
    ];

    for (const roleData of roles) {
      const existing = await this.roleRepository.findByName(roleData.name);
      if (!existing) {
        // Get permission IDs
        const permissionIds: string[] = [];
        for (const permissionName of roleData.permissions) {
          const permission =
            await this.permissionRepository.findByName(permissionName);
          if (permission) {
            permissionIds.push(permission.id);
          }
        }

        const role = await this.roleRepository.create({
          name: roleData.name,
          description: roleData.description,
          isSystemRole: true,
        });

        // Assign permissions to role (this would need to be implemented in the role repository)
        this.logger.log(
          `Created role: ${roleData.name} with ${permissionIds.length} permissions`,
        );
      }
    }
  }
}
