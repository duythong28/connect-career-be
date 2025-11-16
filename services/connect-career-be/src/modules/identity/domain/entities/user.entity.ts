import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Role } from './role.entity';
import { UserSession } from './user-session.entity';
import { MfaDevice } from './mfa-device.entity';
import { OAuthAccount, AuthProvider } from './oauth-account.entity';
import { CandidateProfile } from 'src/modules/profile/domain/entities/candidate-profile.entity';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true, nullable: true })
  username?: string;

  @Column({ nullable: true })
  passwordHash?: string;

  @Column({ nullable: true })
  firstName?: string;

  @Column({ nullable: true })
  lastName?: string;

  @Column({ nullable: true })
  fullName?: string;

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({ nullable: true })
  phoneNumber?: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING_VERIFICATION,
  })
  status: UserStatus;

  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  authProvider: AuthProvider;

  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  primaryAuthProvider: AuthProvider;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ nullable: true })
  emailVerificationToken?: string;

  @Column({ nullable: true })
  emailVerificationExpires?: Date;

  @Column({ nullable: true })
  passwordResetToken?: string;

  @Column({ nullable: true })
  passwordResetExpires?: Date;

  @Column({ default: false })
  mfaEnabled: boolean;

  @Column({ nullable: true })
  mfaSecret?: string;

  @Column('simple-array', { nullable: true })
  mfaBackupCodes?: string[];

  @Column({ nullable: true })
  lastLoginAt?: Date;

  @Column({ nullable: true })
  lastLoginIp?: string;

  @Column({ default: 0 })
  failedLoginAttempts: number;

  @Column({ nullable: true })
  lockedUntil?: Date;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @ManyToMany(() => Role, (role) => role.users)
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];

  @OneToMany(() => UserSession, (session) => session.user)
  sessions: UserSession[];

  @OneToMany(() => MfaDevice, (device) => device.user)
  mfaDevices: MfaDevice[];

  @OneToMany(() => OAuthAccount, (account) => account.user)
  oauthAccounts: OAuthAccount[];

  @OneToOne(() => CandidateProfile, (profile) => profile.user, {
    nullable: true,
    cascade: false,
  })
  candidateProfile?: CandidateProfile;

  // Computed properties
  get isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  get isLocked(): boolean {
    return this.lockedUntil ? new Date() < this.lockedUntil : false;
  }

  // Methods
  updateLastLogin(ipAddress: string): void {
    this.lastLoginAt = new Date();
    this.lastLoginIp = ipAddress;
    this.failedLoginAttempts = 0;
    this.lockedUntil = undefined;
  }

  incrementFailedLoginAttempts(): void {
    this.failedLoginAttempts += 1;

    if (this.failedLoginAttempts >= 5) {
      this.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    }
  }

  resetFailedLoginAttempts(): void {
    this.failedLoginAttempts = 0;
    this.lockedUntil = undefined;
  }

  activate(): void {
    this.status = UserStatus.ACTIVE;
    this.emailVerified = true;
    this.emailVerificationToken = undefined;
    this.emailVerificationExpires = undefined;
  }

  suspend(): void {
    this.status = UserStatus.SUSPENDED;
  }

  deactivate(): void {
    this.status = UserStatus.INACTIVE;
  }

  // Authorization methods
  hasRole(roleName: string): boolean {
    if (!this.roles) return false;
    return this.roles.some((role) => role.name === roleName);
  }

  hasPermission(permissionName: string): boolean {
    if (!this.roles) return false;

    return this.roles.some(
      (role) =>
        role.permissions &&
        role.permissions.some(
          (permission) => permission.name === permissionName,
        ),
    );
  }

  hasAnyRole(roleNames: string[]): boolean {
    return roleNames.some((roleName) => this.hasRole(roleName));
  }

  getRoleNames(): string[] {
    if (!this.roles) return [];
    return this.roles.map((role) => role.name);
  }

  getPermissionNames(): string[] {
    if (!this.roles) return [];

    const permissions = new Set<string>();
    this.roles.forEach((role) => {
      if (role.permissions) {
        role.permissions.forEach((permission) => {
          permissions.add(permission.name);
        });
      }
    });

    return Array.from(permissions);
  }
}
