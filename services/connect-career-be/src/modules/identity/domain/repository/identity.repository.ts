import {
  User,
  Role,
  Permission,
  UserSession,
  MfaDevice,
  OAuthAccount,
} from '../entities';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByIds(ids: string[]): Promise<User[]>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByEmailOrUsername(identifier: string): Promise<User | null>;
  create(user: Partial<User>): Promise<User>;
  update(id: string, updates: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
  findWithRoles(id: string): Promise<User | null>;
  findWithPermissions(id: string): Promise<User | null>;
  findByEmailVerificationToken(token: string): Promise<User | null>;
  findByPasswordResetToken(token: string): Promise<User | null>;
}

export interface IRoleRepository {
  findById(id: string): Promise<Role | null>;
  findByName(name: string): Promise<Role | null>;
  findAll(): Promise<Role[]>;
  findActive(): Promise<Role[]>;
  create(role: Partial<Role>): Promise<Role>;
  update(id: string, updates: Partial<Role>): Promise<Role>;
  delete(id: string): Promise<void>;
  findWithPermissions(id: string): Promise<Role | null>;
  findByUserId(userId: string): Promise<Role[]>;
}

export interface IPermissionRepository {
  findById(id: string): Promise<Permission | null>;
  findByName(name: string): Promise<Permission | null>;
  findAll(): Promise<Permission[]>;
  findActive(): Promise<Permission[]>;
  create(permission: Partial<Permission>): Promise<Permission>;
  update(id: string, updates: Partial<Permission>): Promise<Permission>;
  delete(id: string): Promise<void>;
  findByRoleId(roleId: string): Promise<Permission[]>;
  findByUserId(userId: string): Promise<Permission[]>;
}

export interface IUserSessionRepository {
  findById(id: string): Promise<UserSession | null>;
  findByRefreshToken(refreshToken: string): Promise<UserSession | null>;
  findByAccessTokenJti(jti: string): Promise<UserSession | null>;
  findActiveByUserId(userId: string): Promise<UserSession[]>;
  create(session: Partial<UserSession>): Promise<UserSession>;
  update(id: string, updates: Partial<UserSession>): Promise<UserSession>;
  delete(id: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
  deleteExpired(): Promise<void>;
  revokeAllByUserId(userId: string): Promise<void>;
}

export interface IMfaDeviceRepository {
  findById(id: string): Promise<MfaDevice | null>;
  findByUserId(userId: string): Promise<MfaDevice[]>;
  findActiveByUserId(userId: string): Promise<MfaDevice[]>;
  findPrimaryByUserId(userId: string): Promise<MfaDevice | null>;
  create(device: Partial<MfaDevice>): Promise<MfaDevice>;
  update(id: string, updates: Partial<MfaDevice>): Promise<MfaDevice>;
  delete(id: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
}

export interface IOAuthAccountRepository {
  findById(id: string): Promise<OAuthAccount | null>;
  findByProviderAndAccountId(
    provider: string,
    providerAccountId: string,
  ): Promise<OAuthAccount | null>;
  findByUserId(userId: string): Promise<OAuthAccount[]>;
  findActiveByUserId(userId: string): Promise<OAuthAccount[]>;
  create(account: Partial<OAuthAccount>): Promise<OAuthAccount>;
  update(id: string, updates: Partial<OAuthAccount>): Promise<OAuthAccount>;
  delete(id: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
}
