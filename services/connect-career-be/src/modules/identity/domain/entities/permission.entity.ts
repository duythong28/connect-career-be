import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
} from 'typeorm';
import { Role } from './role.entity';

export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage',
}

export enum ResourceType {
  USER = 'user',
  ROLE = 'role',
  PERMISSION = 'permission',
  BLOG = 'blog',
  CV = 'cv',
  CHAT = 'chat',
  NOTIFICATION = 'notification',
  PORTFOLIO = 'portfolio',
  SUBSCRIPTION = 'subscription',
  LEARNING = 'learning',
  AI_RESUME = 'ai_resume',
}

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: PermissionAction,
  })
  action: PermissionAction;

  @Column({
    type: 'enum',
    enum: ResourceType,
  })
  resource: ResourceType;

  @Column({ nullable: true })
  resourceId?: string; // For resource-specific permissions

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isSystemPermission: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];

  // Domain methods
  static createPermissionName(
    action: PermissionAction,
    resource: ResourceType,
    resourceId?: string,
  ): string {
    const base = `${action}:${resource}`;
    return resourceId ? `${base}:${resourceId}` : base;
  }

  get fullPermissionName(): string {
    return Permission.createPermissionName(
      this.action,
      this.resource,
      this.resourceId,
    );
  }

  matches(
    action: PermissionAction,
    resource: ResourceType,
    resourceId?: string,
  ): boolean {
    if (this.action !== action || this.resource !== resource) {
      return false;
    }

    // If this permission is for a specific resource, check the ID
    if (this.resourceId) {
      return this.resourceId === resourceId;
    }

    // If this permission is general (no resourceId), it matches any resource of this type
    return true;
  }
}
