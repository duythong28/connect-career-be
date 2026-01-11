import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  InvitationStatus,
  MembershipStatus,
  OrganizationInvitation,
  OrganizationMembership,
  OrganizationPermission,
  OrganizationPermissionAction,
  OrganizationResourceType,
  OrganizationRole,
} from '../../domain/entities/organization-memberships.entity';
import { CreateOrganizationDto } from '../dtos/create-organization.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../../domain/entities/organization.entity';
import { User } from 'src/modules/identity/domain/entities';
import { DEFAULT_ORGANIZATION_ROLES } from '../../infrastructure/seeders/organization-roles.seeder';

@Injectable()
export class OrganizationRBACService {
  private readonly logger = new Logger(OrganizationRBACService.name);
  constructor(
    @InjectRepository(OrganizationMembership)
    private readonly membershipRepository: Repository<OrganizationMembership>,

    @InjectRepository(OrganizationRole)
    private readonly roleRepository: Repository<OrganizationRole>,

    @InjectRepository(OrganizationPermission)
    private readonly permissionRepository: Repository<OrganizationPermission>,

    @InjectRepository(OrganizationInvitation)
    private readonly invitationRepository: Repository<OrganizationInvitation>,

    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createOrganizationWithOwner(
    userId: string,
    organizationData: CreateOrganizationDto,
  ): Promise<Organization> {
    const organization = await this.organizationRepository.save({
      ...organizationData,
      userId,
      isActive: true,
      isPublic: false,
      isVerified: true,
    });
    try {
      await this.createDefaultPermissions();

      await this.createDefaultRolesForOrganization(organization.id);

      const ownerRole = await this.roleRepository.findOne({
        where: { name: 'owner', organizationId: organization.id },
      });
      if (ownerRole) {
        await this.addMemberToOrganization(
          organization.id,
          userId,
          ownerRole.id,
          userId,
        );
      }
      return organization;
    } catch (error) {
      this.logger.error(
        `Failed to create organization with RBAC: ${error.message}`,
      );
      await this.organizationRepository.delete(organization.id);
      throw new BadRequestException(
        'Failed to create organization with proper permissions',
      );
    }
  }

  async createDefaultPermissions(): Promise<void> {
    const defaultPermissions = [
      {
        name: 'manage:organization',
        action: OrganizationPermissionAction.MANAGE,
        resource: OrganizationResourceType.ORGANIZATION,
        description: 'Manage organization settings and permissions',
      },
      {
        name: 'read:organization',
        action: OrganizationPermissionAction.READ,
        resource: OrganizationResourceType.ORGANIZATION,
        description: 'Read organization settings and permissions',
      },
      {
        name: 'create:organization',
        action: OrganizationPermissionAction.CREATE,
        resource: OrganizationResourceType.ORGANIZATION,
        description: 'Create new organizations',
      },

      // Jobs permissions
      {
        name: 'manage:jobs',
        action: OrganizationPermissionAction.MANAGE,
        resource: OrganizationResourceType.JOBS,
        description: 'Full job management',
      },
      {
        name: 'create:jobs',
        action: OrganizationPermissionAction.CREATE,
        resource: OrganizationResourceType.JOBS,
        description: 'Create jobs',
      },
      {
        name: 'read:jobs',
        action: OrganizationPermissionAction.READ,
        resource: OrganizationResourceType.JOBS,
        description: 'Read jobs',
      },
      {
        name: 'update:jobs',
        action: OrganizationPermissionAction.UPDATE,
        resource: OrganizationResourceType.JOBS,
        description: 'Update jobs',
      },
      {
        name: 'delete:jobs',
        action: OrganizationPermissionAction.DELETE,
        resource: OrganizationResourceType.JOBS,
        description: 'Delete jobs',
      },

      // Applications permissions
      {
        name: 'manage:applications',
        action: OrganizationPermissionAction.MANAGE,
        resource: OrganizationResourceType.APPLICATIONS,
        description: 'Full application management',
      },
      {
        name: 'read:applications',
        action: OrganizationPermissionAction.READ,
        resource: OrganizationResourceType.APPLICATIONS,
        description: 'Read applications',
      },
      {
        name: 'update:applications',
        action: OrganizationPermissionAction.UPDATE,
        resource: OrganizationResourceType.APPLICATIONS,
        description: 'Update applications',
      },

      // Members permissions
      {
        name: 'manage:members',
        action: OrganizationPermissionAction.MANAGE,
        resource: OrganizationResourceType.MEMBERS,
        description: 'Full member management',
      },
      {
        name: 'read:members',
        action: OrganizationPermissionAction.READ,
        resource: OrganizationResourceType.MEMBERS,
        description: 'Read member information',
      },
      {
        name: 'update:members',
        action: OrganizationPermissionAction.UPDATE,
        resource: OrganizationResourceType.MEMBERS,
        description: 'Update member information',
      },

      // Reports permissions
      {
        name: 'manage:reports',
        action: OrganizationPermissionAction.MANAGE,
        resource: OrganizationResourceType.REPORTS,
        description: 'Full report management',
      },
      {
        name: 'read:reports',
        action: OrganizationPermissionAction.READ,
        resource: OrganizationResourceType.REPORTS,
        description: 'Read reports',
      },

      // Settings permissions
      {
        name: 'manage:settings',
        action: OrganizationPermissionAction.MANAGE,
        resource: OrganizationResourceType.SETTINGS,
        description: 'Full settings management',
      },
      {
        name: 'read:settings',
        action: OrganizationPermissionAction.READ,
        resource: OrganizationResourceType.SETTINGS,
        description: 'Read settings',
      },
    ];

    for (const permData of defaultPermissions) {
      const existing = await this.permissionRepository.findOne({
        where: { name: permData.name },
      });
      if (!existing) {
        await this.permissionRepository.save(permData);
      }
    }
  }

  async createDefaultRolesForOrganization(
    organizationId: string,
  ): Promise<void> {
    const allPermissions = await this.permissionRepository.find();

    for (const roleData of DEFAULT_ORGANIZATION_ROLES) {
      const role = await this.roleRepository.save({
        organizationId,
        name: roleData.name,
        description: roleData.description,
        isSystemRole: roleData.isSystemRole,
        isActive: true,
      });

      // Assign permissions to role
      const rolePermissions = allPermissions.filter((permission) =>
        roleData.permissions.includes(permission.name),
      );

      role.permissions = rolePermissions;
      await this.roleRepository.save(role);
    }
  }

  async addMemberToOrganization(
    organizationId: string,
    userId: string,
    roleId: string,
    invitedBy: string,
  ): Promise<OrganizationMembership> {
    const existingMember = await this.membershipRepository.findOne({
      where: { organizationId, userId },
    });

    if (existingMember) {
      throw new BadRequestException(
        'User already a member of the organization',
      );
    }

    const role = await this.roleRepository.findOne({
      where: { id: roleId, organizationId },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException(
        'Role not found or does not belong to this organization',
      );
    }

    return this.membershipRepository.save({
      organizationId,
      userId,
      roleId,
      invitedBy,
      status: MembershipStatus.ACTIVE,
      invitedAt: new Date(),
      joinedAt: new Date(),
    });
  }

  async inviteUserToOrganization(
    organizationId: string,
    email: string,
    roleId: string,
    invitedBy: string,
  ): Promise<OrganizationInvitation> {
    const existingMember = await this.membershipRepository
      .createQueryBuilder('membership')
      .leftJoin('membership.user', 'user')
      .where('membership.organizationId = :organizationId', { organizationId })
      .andWhere('user.email = :email', { email })
      .getOne();

    if (existingMember) {
      throw new BadRequestException(
        'User is already a member of this organization',
      );
    }
    const existingInvitation = await this.invitationRepository.findOne({
      where: { organizationId, email, status: InvitationStatus.PENDING },
    });
    if (existingInvitation) {
      throw new BadRequestException(
        'User already invited to this organization',
      );
    }
    const role = await this.roleRepository.findOne({
      where: { id: roleId, organizationId },
    });

    if (!role) {
      throw new NotFoundException(
        'Role not found or does not belong to this organization',
      );
    }
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return this.invitationRepository.save({
      organizationId,
      email,
      roleId,
      invitedBy,
      status: InvitationStatus.PENDING,
      token,
      expiresAt,
    });
  }

  async acceptInvitation(
    token: string,
    userId: string,
  ): Promise<OrganizationMembership> {
    const invitation = await this.invitationRepository.findOne({
      where: { token },
      relations: ['organization', 'role'],
    });

    if (!invitation) {
      throw new NotFoundException('Invalid invitation token');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Invitation is no longer valid');
    }

    if (invitation.expiresAt < new Date()) {
      await this.invitationRepository.update(invitation.id, {
        status: InvitationStatus.EXPIRED,
      });
      throw new BadRequestException('Invitation has expired');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || user.email !== invitation.email) {
      throw new BadRequestException('Email does not match invitation');
    }

    const existingMember = await this.membershipRepository.findOne({
      where: { organizationId: invitation.organizationId, userId },
    });
    if (existingMember) {
      throw new BadRequestException(
        'User already a member of this organization',
      );
    }
    const membership = await this.membershipRepository.save({
      organizationId: invitation.organizationId,
      userId,
      roleId: invitation.roleId,
      status: MembershipStatus.ACTIVE,
      invitedBy: invitation.invitedBy,
      invitedAt: invitation.createdAt,
      joinedAt: new Date(),
    });
    await this.invitationRepository.update(invitation.id, {
      status: InvitationStatus.ACCEPTED,
      acceptedAt: new Date(),
    });

    this.logger.log(
      `User ${userId} accepted invitation to organization ${invitation.organizationId}`,
    );
    return membership;
  }

  async hasPermission(
    userId: string,
    organizationId: string,
    action: OrganizationPermissionAction,
    resource: OrganizationResourceType,
  ): Promise<boolean> {
    const membership = await this.membershipRepository.findOne({
      where: { userId, organizationId, status: MembershipStatus.ACTIVE },
      relations: ['role', 'role.permissions'],
    });

    if (!membership || !membership.role || !membership.role.permissions) {
      return false;
    }

    return membership.role.permissions.some(
      (permission) =>
        permission.action === action && permission.resource === resource,
    );
  }

  async getUserRoleInOrganization(
    userId: string,
    organizationId: string,
  ): Promise<OrganizationRole | null> {
    const membership = await this.membershipRepository.findOne({
      where: { userId, organizationId, status: MembershipStatus.ACTIVE },
      relations: ['role', 'role.permissions'],
    });
    return membership?.role || null;
  }

  async getOrganizationMembers(
    organizationId: string,
  ): Promise<OrganizationMembership[]> {
    return this.membershipRepository.find({
      where: { organizationId },
      relations: ['user', 'role'],
      order: { createdAt: 'DESC' },
    });
  }

  async getUserOrganizations(
    userId: string,
  ): Promise<OrganizationMembership[]> {
    return this.membershipRepository.find({
      where: { userId, status: MembershipStatus.ACTIVE },
      relations: ['organization', 'role'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateMemberRole(
    organizationId: string,
    memberId: string,
    newRoleId: string,
    updatedBy: string,
  ): Promise<OrganizationMembership> {
    const hasPermission = await this.hasPermission(
      updatedBy,
      organizationId,
      OrganizationPermissionAction.MANAGE,
      OrganizationResourceType.MEMBERS,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to manage members',
      );
    }

    const membership = await this.membershipRepository.findOne({
      where: { organizationId, userId: memberId },
    });
    if (!membership) {
      throw new NotFoundException('Member not found');
    }

    const newRole = await this.roleRepository.findOne({
      where: { id: newRoleId, organizationId },
    });
    if (!newRole) {
      throw new NotFoundException(
        'Role not found or does not belong to organization',
      );
    }

    membership.roleId = newRoleId;
    return this.membershipRepository.save(membership);
  }

  async removeMemberFromOrganization(
    organizationId: string,
    memberId: string,
    removedBy: string,
  ): Promise<void> {
    const hasPermission = await this.hasPermission(
      removedBy,
      organizationId,
      OrganizationPermissionAction.MANAGE,
      OrganizationResourceType.MEMBERS,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to remove members',
      );
    }

    const membership = await this.membershipRepository.findOne({
      where: { organizationId, userId: memberId },
    });
    if (!membership) {
      throw new NotFoundException('Member not found');
    }

    membership.status = MembershipStatus.LEFT;
    await this.membershipRepository.save(membership);
  }

  async getOrganizationRoles(
    organizationId: string,
  ): Promise<OrganizationRole[]> {
    return this.roleRepository.find({
      where: { organizationId, isActive: true },
      relations: ['permissions'],
      order: { isSystemRole: 'DESC', name: 'ASC' },
    });
  }

  async getPendingInvitations(
    organizationId: string,
  ): Promise<OrganizationInvitation[]> {
    return this.invitationRepository.find({
      where: { organizationId, status: InvitationStatus.PENDING },
      relations: ['role'],
      order: { createdAt: 'DESC' },
    });
  }

  async isOwner(userId: string, organizationId: string): Promise<boolean> {
    const role = await this.getUserRoleInOrganization(userId, organizationId);
    return role?.name === 'owner';
  }

  async isAdmin(userId: string, organizationId: string): Promise<boolean> {
    const role = await this.getUserRoleInOrganization(userId, organizationId);
    return role?.name === 'admin' || role?.name === 'owner';
  }

  async declineInvitation(token: string): Promise<void> {
    const invitation = await this.invitationRepository.findOne({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException('Invalid invitation token');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Invitation is no longer valid');
    }

    await this.invitationRepository.update(invitation.id, {
      status: InvitationStatus.DECLINED,
    });
  }

  async cancelInvitation(
    invitationId: string,
    cancelledBy: string,
  ): Promise<void> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    const hasPermission = await this.hasPermission(
      cancelledBy,
      invitation.organizationId,
      OrganizationPermissionAction.MANAGE,
      OrganizationResourceType.MEMBERS,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to cancel invitations',
      );
    }

    await this.invitationRepository.update(invitationId, {
      status: InvitationStatus.CANCELLED,
    });
  }

  async getOrganizationStats(organizationId: string): Promise<{
    totalMembers: number;
    activeMembers: number;
    pendingInvitations: number;
    roles: number;
  }> {
    const [members, pendingInvitations, roles] = await Promise.all([
      this.membershipRepository.find({
        where: { organizationId },
      }),
      this.invitationRepository.find({
        where: { organizationId, status: InvitationStatus.PENDING },
      }),
      this.roleRepository.find({
        where: { organizationId, isActive: true },
      }),
    ]);

    return {
      totalMembers: members.length,
      activeMembers: members.filter((m) => m.status === MembershipStatus.ACTIVE)
        .length,
      pendingInvitations: pendingInvitations.length,
      roles: roles.length,
    };
  }
}
