// services/connect-career-be/src/modules/profile/infrastructure/migrations/organization-rbac-migration.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/modules/identity/domain/entities';
import { Organization } from '../domain/entities/organization.entity';
import { MembershipStatus, OrganizationMembership, OrganizationPermission, OrganizationPermissionAction, OrganizationResourceType, OrganizationRole } from '../domain/entities/organization-memberships.entity';
import { DEFAULT_ORGANIZATION_ROLES } from './seeders/organization-roles.seeder';

@Injectable()
export class OrganizationRBACMigrationService {
  private readonly logger = new Logger(OrganizationRBACMigrationService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    
    @InjectRepository(OrganizationPermission)
    private readonly permissionRepository: Repository<OrganizationPermission>,
    
    @InjectRepository(OrganizationRole)
    private readonly roleRepository: Repository<OrganizationRole>,
    
    @InjectRepository(OrganizationMembership)
    private readonly membershipRepository: Repository<OrganizationMembership>,
  ) {}

  /**
   * Run the complete migration process
   */
  async migrateAllOrganizations(): Promise<void> {
    this.logger.log('Starting organization RBAC migration...');

    try {
      await this.createDefaultPermissions();

      const organizations = await this.organizationRepository.find({
        relations: ['user']
      });
      
      this.logger.log(`Found ${organizations.length} organizations to migrate`);

      for (const organization of organizations) {
        await this.migrateOrganization(organization.id);
        this.logger.log(`✅ Migrated organization: ${organization.name} (${organization.id})`);
      }

      this.logger.log('🎉 Organization RBAC migration completed successfully!');
    } catch (error) {
      this.logger.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Create default permissions
   */
  private async createDefaultPermissions(): Promise<void> {
    const defaultPermissions = [
      // Organization permissions
      { name: 'manage:organization', action: OrganizationPermissionAction.MANAGE, resource: OrganizationResourceType.ORGANIZATION, description: 'Manage organization settings and permissions' },
      { name: 'read:organization', action: OrganizationPermissionAction.READ, resource: OrganizationResourceType.ORGANIZATION, description: 'Read organization settings and permissions' },
      { name: 'update:organization', action: OrganizationPermissionAction.UPDATE, resource: OrganizationResourceType.ORGANIZATION, description: 'Update organization information' },
      
      // Jobs permissions
      { name: 'manage:jobs', action: OrganizationPermissionAction.MANAGE, resource: OrganizationResourceType.JOBS, description: 'Full job management' },
      { name: 'create:jobs', action: OrganizationPermissionAction.CREATE, resource: OrganizationResourceType.JOBS, description: 'Create jobs' },
      { name: 'read:jobs', action: OrganizationPermissionAction.READ, resource: OrganizationResourceType.JOBS, description: 'Read jobs' },
      { name: 'update:jobs', action: OrganizationPermissionAction.UPDATE, resource: OrganizationResourceType.JOBS, description: 'Update jobs' },
      { name: 'delete:jobs', action: OrganizationPermissionAction.DELETE, resource: OrganizationResourceType.JOBS, description: 'Delete jobs' },
      
      // Applications permissions
      { name: 'manage:applications', action: OrganizationPermissionAction.MANAGE, resource: OrganizationResourceType.APPLICATIONS, description: 'Full application management' },
      { name: 'read:applications', action: OrganizationPermissionAction.READ, resource: OrganizationResourceType.APPLICATIONS, description: 'Read applications' },
      { name: 'update:applications', action: OrganizationPermissionAction.UPDATE, resource: OrganizationResourceType.APPLICATIONS, description: 'Update applications' },
      
      // Members permissions
      { name: 'manage:members', action: OrganizationPermissionAction.MANAGE, resource: OrganizationResourceType.MEMBERS, description: 'Full member management' },
      { name: 'read:members', action: OrganizationPermissionAction.READ, resource: OrganizationResourceType.MEMBERS, description: 'Read member information' },
      { name: 'update:members', action: OrganizationPermissionAction.UPDATE, resource: OrganizationResourceType.MEMBERS, description: 'Update member information' },
      
      // Reports permissions
      { name: 'manage:reports', action: OrganizationPermissionAction.MANAGE, resource: OrganizationResourceType.REPORTS, description: 'Full report management' },
      { name: 'read:reports', action: OrganizationPermissionAction.READ, resource: OrganizationResourceType.REPORTS, description: 'Read reports' },
      
      // Settings permissions
      { name: 'manage:settings', action: OrganizationPermissionAction.MANAGE, resource: OrganizationResourceType.SETTINGS, description: 'Full settings management' },
      { name: 'read:settings', action: OrganizationPermissionAction.READ, resource: OrganizationResourceType.SETTINGS, description: 'Read settings' },
    ];

    for (const permData of defaultPermissions) {
      const existing = await this.permissionRepository.findOne({
        where: { name: permData.name }
      });
      if (!existing) {
        await this.permissionRepository.save(permData);
      }
    }
  }

  /**
   * Migrate a single organization
   */
  async migrateOrganization(organizationId: string): Promise<void> {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    // Step 1: Create default roles for this organization
    await this.createDefaultRolesForOrganization(organization.id);

    // Step 2: Add the organization creator as owner
    if (organization.userId) {
      await this.addOwnerToOrganization(organization.id, organization.userId);
    }
  }

  /**
   * Create default roles for an organization
   */
  private async createDefaultRolesForOrganization(organizationId: string): Promise<void> {
    const allPermissions = await this.permissionRepository.find();
    
    for (const roleData of DEFAULT_ORGANIZATION_ROLES) {
      // Check if role already exists
      const existingRole = await this.roleRepository.findOne({
        where: { name: roleData.name, organizationId }
      });
      
      if (existingRole) {
        this.logger.log(`Role ${roleData.name} already exists for organization ${organizationId}`);
        continue;
      }

      const role = await this.roleRepository.save({
        organizationId,
        name: roleData.name,
        description: roleData.description,
        isSystemRole: roleData.isSystemRole,
        isActive: true,
      });

      // Assign permissions to role
      const rolePermissions = allPermissions.filter(permission => 
        roleData.permissions.includes(permission.name)
      );
      
      role.permissions = rolePermissions;
      await this.roleRepository.save(role);
    }
  }

  /**
   * Add organization creator as owner
   */
  private async addOwnerToOrganization(organizationId: string, userId: string): Promise<void> {
    // Check if user is already a member
    const existingMember = await this.membershipRepository.findOne({
      where: { organizationId, userId }
    });
    
    if (existingMember) {
      this.logger.log(`User ${userId} is already a member of organization ${organizationId}`);
      return;
    }

    // Get the owner role
    const ownerRole = await this.roleRepository.findOne({
      where: { name: 'owner', organizationId }
    });
    
    if (!ownerRole) {
      this.logger.error(`Owner role not found for organization ${organizationId}`);
      return;
    }

    // Create membership
    await this.membershipRepository.save({
      organizationId,
      userId,
      roleId: ownerRole.id,
      status: MembershipStatus.ACTIVE,
      invitedBy: userId, // Self-invited as owner
      invitedAt: new Date(),
      joinedAt: new Date(),
    });
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<{
    totalOrganizations: number;
    migratedOrganizations: number;
    organizationsWithRoles: number;
    organizationsWithMembers: number;
  }> {
    const totalOrganizations = await this.organizationRepository.count();
    
    const organizationsWithRolesRaw = await this.roleRepository
      .createQueryBuilder('role')
      .select('COUNT(DISTINCT role.organizationId)', 'count')
      .getRawOne() as { count: string };
    const organizationsWithRoles = parseInt(organizationsWithRolesRaw.count, 10);
    
    const organizationsWithMembersRaw = await this.membershipRepository
      .createQueryBuilder('membership')
      .select('COUNT(DISTINCT membership.organizationId)', 'count')
      .getRawOne() as { count: string };
    const organizationsWithMembers = parseInt(organizationsWithMembersRaw.count, 10);

    return {
      totalOrganizations,
      migratedOrganizations: organizationsWithRoles, // Use the parsed number directly
      organizationsWithRoles: organizationsWithRoles,
      organizationsWithMembers: organizationsWithMembers,
    };
  }
}