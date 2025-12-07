import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { User } from './user.entity';
import { Permission } from './permission.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isSystemRole: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToMany(() => User, (user) => user.roles)
  users: User[];

  @ManyToMany(() => Permission, (permission) => permission.roles)
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: Permission[];

  // Domain methods
  hasPermission(permissionName: string): boolean {
    return (
      this.permissions?.some(
        (permission) => permission.name === permissionName,
      ) || false
    );
  }

  addPermission(permission: Permission): void {
    if (!this.permissions) {
      this.permissions = [];
    }

    if (!this.hasPermission(permission.name)) {
      this.permissions.push(permission);
    }
  }

  removePermission(permissionName: string): void {
    if (this.permissions) {
      this.permissions = this.permissions.filter(
        (p) => p.name !== permissionName,
      );
    }
  }
}
