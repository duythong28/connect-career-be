import { Permission, Role } from '../../domain/entities';
import { User } from '../../domain/entities/user.entity';
import { PermissionResponseDto, RoleWithPermissionsDto } from '../dtos';
import { UserProfileDto } from '../dtos/auth.dto';

export class UserMapper {
  static toPermissionResponseDto(
    permission: Permission,
  ): PermissionResponseDto {
    return {
      id: permission.id,
      name: permission.name,
      description: permission.description,
      action: permission.action,
      resource: permission.resource,
      resourceId: permission.resourceId,
      isActive: permission.isActive,
      isSystemPermission: permission.isSystemPermission,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
    };
  }

  static toRoleWithPermissionsDto(role: Role): RoleWithPermissionsDto {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isActive: role.isActive,
      isSystemRole: role.isSystemRole,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions:
        role.permissions?.map((permission) =>
          this.toPermissionResponseDto(permission),
        ) || [],
    };
  }

  static toUserProfileDto(user: User): UserProfileDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar || user.avatarUrl,
      emailVerified: user.emailVerified,
      mfaEnabled: user.mfaEnabled,
      createdAt: user.createdAt,
      roles: user.roles?.map((role) => this.toRoleWithPermissionsDto(role)),
    };
  }

  static toUserProfileDtoArray(users: User[]): UserProfileDto[] {
    return users.map((user) => this.toUserProfileDto(user));
  }
}
