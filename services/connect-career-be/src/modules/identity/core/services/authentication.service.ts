import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import * as identityRepository from '../../domain/repository/identity.repository';
import {
  User,
  UserStatus,
  AuthProvider,
  MfaDeviceType,
  MfaDeviceStatus,
} from '../../domain/entities';
import { EventBus } from '@nestjs/cqrs';
import { UserRegisteredEvent } from '../../domain/events/user-register.event';
import { PasswordResetRequestedEvent } from '../../domain/events/password-reset-requested.event';

export interface LoginCredentials {
  identifier: string; // email or username
  password: string;
  mfaCode?: string;
  deviceId?: string;
  deviceName?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface MfaSetupResult {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface OAuthProfile {
  provider: AuthProvider;
  providerId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

@Injectable()
export class AuthenticationService {
  private readonly logger = new Logger(AuthenticationService.name);

  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: identityRepository.IUserRepository,
    @Inject('IUserSessionRepository')
    private readonly sessionRepository: identityRepository.IUserSessionRepository,
    @Inject('IMfaDeviceRepository')
    private readonly mfaDeviceRepository: identityRepository.IMfaDeviceRepository,
    @Inject('IOAuthAccountRepository')
    private readonly oauthAccountRepository: identityRepository.IOAuthAccountRepository,
    @Inject('IRoleRepository')
    private readonly roleRepository: identityRepository.IRoleRepository,
    private readonly jwtService: JwtService,
    private readonly eventBus: EventBus,
    private readonly configService: ConfigService,
  ) {}

  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    const user = await this.validateUser(
      credentials.identifier,
      credentials.password,
    );

    if (!user.isActive) {
      throw new UnauthorizedException('Account is not active');
    }

    if (user.isLocked) {
      throw new UnauthorizedException(
        'Account is temporarily locked due to failed login attempts',
      );
    }

    // Check if MFA is required
    if (user.mfaEnabled) {
      if (!credentials.mfaCode) {
        throw new UnauthorizedException('MFA code required');
      }
      await this.validateMfaCode(user.id, credentials.mfaCode);
    }

    // Update user login info
    user.updateLastLogin(credentials.ipAddress || '');
    await this.userRepository.update(user.id, user);

    // Generate tokens and create session
    return this.createUserSession(user, credentials);
  }

  async register(userData: {
    email: string;
    password: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
  }): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    if (userData.username) {
      const existingUsername = await this.userRepository.findByUsername(
        userData.username,
      );
      if (existingUsername) {
        throw new BadRequestException('Username already taken');
      }
    }

    const passwordHash = await this.hashPassword(userData.password);
    const verificationToken = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await this.userRepository.create({
      ...userData,
      passwordHash,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: expiresAt,
      status: UserStatus.PENDING_VERIFICATION,
    });
    try {
      const defaultRole = await this.roleRepository.findByName('user');
      if (defaultRole) {
        if (!user.roles) {
          user.roles = [];
        }
        user.roles.push(defaultRole);
        await this.userRepository.update(user.id, user);
      }
    } catch (error) {
      this.logger.warn('Failed to assign default role to user:', error);
    }
    this.eventBus.publish(
      new UserRegisteredEvent(
        user.fullName!,
        user.id,
        user.email,
        verificationToken,
        expiresAt,
      ),
    );
    return user;
  }

  async validateUser(identifier: string, password: string): Promise<User> {
    const user = await this.userRepository.findByEmailOrUsername(identifier);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      user.incrementFailedLoginAttempts();
      await this.userRepository.update(user.id, user);
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const session =
      await this.sessionRepository.findByRefreshToken(refreshToken);
    if (!session || !session.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userRepository.findById(session.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const tokens = await this.generateTokens(user);

    await this.sessionRepository.update(session.id, {
      refreshToken: tokens.refreshToken,
      accessTokenJti: this.extractJtiFromToken(tokens.accessToken),
      lastActivityAt: new Date(),
    });

    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    const session =
      await this.sessionRepository.findByRefreshToken(refreshToken);
    if (session) {
      session.revoke();
      await this.sessionRepository.update(session.id, session);
    }
  }

  async logoutAllDevices(userId: string): Promise<void> {
    await this.sessionRepository.revokeAllByUserId(userId);
  }

  // MFA Methods
  async setupMfa(
    userId: string,
    deviceType: MfaDeviceType = MfaDeviceType.TOTP,
  ): Promise<MfaSetupResult> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (deviceType === MfaDeviceType.TOTP) {
      const secret = speakeasy.generateSecret({
        name: `ConnectCareer (${user.email})`,
        issuer: 'ConnectCareer',
      });

      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

      const device = await this.mfaDeviceRepository.create({
        userId: user.id,
        type: deviceType,
        secret: secret.base32,
        status: MfaDeviceStatus.PENDING,
      });

      const backupCodes = device.generateBackupCodes();
      await this.mfaDeviceRepository.update(device.id, device);

      return {
        secret: secret.base32!,
        qrCodeUrl,
        backupCodes,
      };
    }

    throw new BadRequestException('Unsupported MFA device type');
  }

  async verifyMfaSetup(
    userId: string,
    deviceId: string,
    code: string,
  ): Promise<boolean> {
    const device = await this.mfaDeviceRepository.findById(deviceId);
    if (!device || device.userId !== userId) {
      throw new BadRequestException('MFA device not found');
    }

    if (device.type === MfaDeviceType.TOTP && device.secret) {
      const isValid = speakeasy.totp.verify({
        secret: device.secret,
        encoding: 'base32',
        token: code,
        window: 2,
      });

      if (isValid) {
        device.activate();
        await this.mfaDeviceRepository.update(device.id, device);

        // Enable MFA for user if this is their first device
        const user = await this.userRepository.findById(userId);
        if (user && !user.mfaEnabled) {
          await this.userRepository.update(userId, { mfaEnabled: true });
        }

        return true;
      }
    }

    return false;
  }

  async validateMfaCode(userId: string, code: string): Promise<boolean> {
    const devices = await this.mfaDeviceRepository.findActiveByUserId(userId);

    for (const device of devices) {
      if (device.type === MfaDeviceType.TOTP && device.secret) {
        const isValid = speakeasy.totp.verify({
          secret: device.secret,
          encoding: 'base32',
          token: code,
          window: 2,
        });

        if (isValid) {
          device.recordUsage();
          await this.mfaDeviceRepository.update(device.id, device);
          return true;
        }
      }

      // Check backup codes
      if (device.useBackupCode(code)) {
        await this.mfaDeviceRepository.update(device.id, device);
        return true;
      }
    }

    return false;
  }

  // OAuth Methods
  async handleOAuthLogin(
    profile: OAuthProfile,
    deviceInfo?: Partial<LoginCredentials>,
  ): Promise<AuthTokens> {
    let user = await this.findUserByOAuthProfile(profile);

    if (!user) {
      // Create new user from OAuth profile
      user = await this.createUserFromOAuthProfile(profile);
    }

    // Update or create OAuth account
    await this.updateOAuthAccount(user.id, profile);

    if (!user.isActive) {
      throw new UnauthorizedException('Account is not active');
    }

    // Update user login info
    user.updateLastLogin(deviceInfo?.ipAddress || '');
    await this.userRepository.update(user.id, user);

    // Generate tokens and create session
    return this.createUserSession(user, deviceInfo || {});
  }

  // Private helper methods
  private async createUserSession(
    user: User,
    deviceInfo: Partial<LoginCredentials>,
  ): Promise<AuthTokens> {
    const tokens = await this.generateTokens(user);

    await this.sessionRepository.create({
      userId: user.id,
      refreshToken: tokens.refreshToken,
      accessTokenJti: this.extractJtiFromToken(tokens.accessToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
      deviceId: deviceInfo.deviceId,
      deviceName: deviceInfo.deviceName,
      lastActivityAt: new Date(),
    });

    return tokens;
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      jti: uuidv4(),
    };

    const isDevelopment =
      this.configService.get<string>('NODE_ENV') === 'development';
    const unlimitedDev = this.configService.get<boolean>('JWT_UNLIMITED_DEV');

    const signOptions: any = {};
    let expiresInSeconds: number;

    if (isDevelopment && unlimitedDev) {
      expiresInSeconds = 0; // Indicates unlimited
    } else {
      signOptions.expiresIn = '2d';
      expiresInSeconds = 2 * 24 * 60 * 60; // 2 days
    }

    const accessToken = await this.jwtService.signAsync(payload, signOptions);
    const refreshToken = uuidv4();

    return {
      accessToken,
      refreshToken,
      expiresIn: expiresInSeconds,
      tokenType: 'Bearer',
    };
  }

  private extractJtiFromToken(token: string): string {
    const decoded = this.jwtService.decode(token);
    return decoded?.jti || '';
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  private async findUserByOAuthProfile(
    profile: OAuthProfile,
  ): Promise<User | null> {
    const oauthAccount =
      await this.oauthAccountRepository.findByProviderAndAccountId(
        profile.provider,
        profile.providerId,
      );

    if (oauthAccount) {
      return this.userRepository.findById(oauthAccount.userId);
    }

    // Try to find by email
    return this.userRepository.findByEmail(profile.email);
  }

  private async createUserFromOAuthProfile(
    profile: OAuthProfile,
  ): Promise<User> {
    return this.userRepository.create({
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      avatar: profile.avatar,
      primaryAuthProvider: profile.provider,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    });
  }

  private async updateOAuthAccount(
    userId: string,
    profile: OAuthProfile,
  ): Promise<void> {
    const existingAccount =
      await this.oauthAccountRepository.findByProviderAndAccountId(
        profile.provider,
        profile.providerId,
      );

    if (existingAccount) {
      existingAccount.updateTokens(
        profile.accessToken,
        profile.refreshToken,
        profile.expiresIn,
      );
      await this.oauthAccountRepository.update(
        existingAccount.id,
        existingAccount,
      );
    } else {
      await this.oauthAccountRepository.create({
        userId,
        provider: profile.provider,
        providerAccountId: profile.providerId,
        accessToken: profile.accessToken,
        refreshToken: profile.refreshToken,
        accessTokenExpires: profile.expiresIn
          ? new Date(Date.now() + profile.expiresIn * 1000)
          : undefined,
      });
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return;
    }
  
    const resetToken = uuidv4();
    const expiresAt = new Date(
      Date.now() +
        this.configService.get<number>('identity.security.passwordResetExpiry', 60) *
          60 *
          1000,
    );
  
    // Update user with reset token
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = expiresAt;
    await this.userRepository.update(user.id, user);
  
    this.eventBus.publish(
      new PasswordResetRequestedEvent(
        user.firstName || user.fullName || 'User',
        user.id,
        user.email,
        resetToken,
        expiresAt,
      ),
    );
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findByPasswordResetToken(token);
  
    if (
      !user ||
      !user.passwordResetExpires ||
      user.passwordResetExpires < new Date()
    ) {
      throw new BadRequestException('Invalid or expired reset token');
    }
  
    // Hash new password
    const passwordHash = await this.hashPassword(newPassword);
  
    // Update user password and clear reset token
    user.passwordHash = passwordHash;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.resetFailedLoginAttempts(); // Reset failed attempts on password reset
  
    await this.userRepository.update(user.id, user);
  }
  async getUsersByIds(userIds: string[]): Promise<User[]> {
    if (!userIds || userIds.length === 0) {
      return [];
    }
    return await this.userRepository.findByIds(userIds);
  }
}
