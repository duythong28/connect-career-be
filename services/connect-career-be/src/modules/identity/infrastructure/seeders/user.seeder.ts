import { Inject, Injectable, Logger } from '@nestjs/common';
import * as identityRepository from '../../domain/repository/identity.repository';
import * as bcrypt from 'bcrypt';
import { User, UserStatus } from '../../domain/entities';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UserSeeder {
  private readonly logger = new Logger(UserSeeder.name);
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: identityRepository.IUserRepository,
    @Inject('IRoleRepository')
    private readonly roleRepository: identityRepository.IRoleRepository,
    @InjectRepository(User)
    private readonly userEntityRepository: Repository<User>,
  ) {}

  async seed(): Promise<void> {
    this.logger.log('Starting admin seeders (users)...');
    await this.createDefaultAdmin();

    await this.createUsersWithAllRoles();
  }
  private async createDefaultAdmin(): Promise<void> {
    const adminEmail =
      process.env.DEFAULT_ADMIN_EMAIL || 'admin@connect-career.com';
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123456';

    const existingAdmin = await this.userRepository.findByEmail(adminEmail);
    if (existingAdmin) {
      this.logger.log('Admin user already exists: ${adminEmail}');
      return;
    }

    const superAdminRole = await this.roleRepository.findByName('super_admin');
    if (!superAdminRole) {
      this.logger.error(
        'super_admin role not found. Please run roles seeder first.',
      );
      return;
    }

    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const adminUser = await this.userRepository.create({
      email: adminEmail,
      username: 'admin',
      firstName: 'System',
      lastName: 'Administrator',
      fullName: 'System Administrator',
      passwordHash,
      emailVerified: true,
      status: UserStatus.ACTIVE,
      isActive: true,
    });

    if (!adminUser.roles) {
      adminUser.roles = [];
    }

    adminUser.roles.push(superAdminRole);
    await this.userEntityRepository.save(adminUser);
    this.logger.log(`Created default admin user: ${adminEmail}`);
    this.logger.log(`Default password: ${adminPassword}`);
    this.logger.log(`Please change the default password after first login!`);
  }

  private async createUsersWithAllRoles(): Promise<void> {
    const defaultPassword = process.env.DEFAULT_USER_PASSWORD || 'User@123456';
    const userTemplates = [
      {
        role: 'super_admin',
        email: 'superadmin@connect-career.com',
        username: 'superadmin',
        firstName: 'Super',
        lastName: 'Admin',
        fullName: 'Super Administrator',
        description: 'Super administrator with full system access',
      },
      {
        role: 'admin',
        email: 'admin2@connect-career.com',
        username: 'admin2',
        firstName: 'Administrator',
        lastName: 'User',
        fullName: 'Administrator User',
        description: 'Administrator with most system access',
      },
      {
        role: 'moderator',
        email: 'moderator@connect-career.com',
        username: 'moderator',
        firstName: 'Content',
        lastName: 'Moderator',
        fullName: 'Content Moderator',
        description: 'Content moderator',
      },
      {
        role: 'premium_user',
        email: 'premium@connect-career.com',
        username: 'premium_user',
        firstName: 'Premium',
        lastName: 'User',
        fullName: 'Premium User',
        description: 'Premium user with enhanced features',
      },
      {
        role: 'user',
        email: 'user@connect-career.com',
        username: 'regular_user',
        firstName: 'Regular',
        lastName: 'User',
        fullName: 'Regular User',
        description: 'Regular user with basic access',
      },
    ];
    this.logger.log(
      `🔧 Creating ${userTemplates.length} users with different roles...`,
    );

    for (const template of userTemplates) {
      await this.createUserWithRole(template, defaultPassword);
    }
  }

  private async createUserWithRole(
    userTemplate: {
      role: string;
      email: string;
      username: string;
      firstName: string;
      lastName: string;
      fullName: string;
      description: string;
    },
    password: string,
  ): Promise<void> {
    const existingUser = await this.userRepository.findByEmail(
      userTemplate.email,
    );
    if (existingUser) {
      this.logger.log(
        `- User already exists: ${userTemplate.email} (${userTemplate.role})`,
      );
      return;
    }
    const role = await this.roleRepository.findByName(userTemplate.role);
    if (!role) {
      this.logger.error(
        `❌ Role not found: ${userTemplate.role}. Skipping user creation.`,
      );
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    try {
      // Create user with all required fields for immediate use
      const user = await this.userRepository.create({
        email: userTemplate.email,
        username: userTemplate.username,
        firstName: userTemplate.firstName,
        lastName: userTemplate.lastName,
        fullName: userTemplate.fullName,
        passwordHash,
        emailVerified: true, // ✅ CRITICAL: Email must be verified to use system
        status: UserStatus.ACTIVE, // ✅ Set to ACTIVE status
        emailVerificationToken: undefined,
        emailVerificationExpires: undefined,
        failedLoginAttempts: 0,
        lockedUntil: undefined,
        // Set last login to current time to show account is ready
        lastLoginAt: new Date(),
      });

      if (!user.roles) {
        user.roles = [];
      }
      user.roles.push(role);

      await this.userEntityRepository.save(user);

      this.logger.log(
        `Created ${userTemplate.role.toUpperCase()}: ${userTemplate.email}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create user ${userTemplate.email}:`,
        error.message,
      );
    }
  }

  async createCustomUser(userData: {
    email: string;
    username?: string;
    firstName: string;
    lastName: string;
    password: string;
    roleName: string;
    phoneNumber?: string;
  }): Promise<User | null> {
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      this.logger.log(`- User already exists: ${userData.email}`);
      return null;
    }
    const role = await this.roleRepository.findByName(userData.roleName);
    if (!role) {
      this.logger.error(
        `❌ Role not found: ${userData.roleName}. Skipping user creation.`,
      );
      return null;
    }
    const passwordHash: string = await bcrypt.hash(userData.password, 12);
    try {
      const user = await this.userRepository.create({
        email: userData.email,
        username: userData.username || userData.email.split('@')[0],
        firstName: userData.firstName,
        lastName: userData.lastName,
        fullName: `${userData.firstName} ${userData.lastName}`,
        phoneNumber: userData.phoneNumber,
        passwordHash,
        emailVerified: true,
        status: UserStatus.ACTIVE,
        emailVerificationToken: undefined,
        emailVerificationExpires: undefined,
        failedLoginAttempts: 0,
        lockedUntil: undefined,
        lastLoginAt: new Date(),
      });

      if (!user.roles) {
        user.roles = [];
      }
      user.roles.push(role);

      const savedUser = await this.userEntityRepository.save(user);

      this.logger.log(`Created custom user: ${userData.email}`);

      return savedUser;
    } catch (error) {
      this.logger.error(
        `Failed to create custom user ${userData.email}:`,
        error.message,
      );
      return null;
    }
  }
  async verifyAllUserEmails(): Promise<void> {
    this.logger.log('Verifying all user emails...');

    try {
      await this.userEntityRepository.update(
        { emailVerified: false },
        {
          emailVerified: true,
          emailVerificationToken: undefined,
          emailVerificationExpires: undefined,
          status: UserStatus.ACTIVE,
        },
      );

      this.logger.log('✅ All user emails have been verified!');
    } catch (error) {
      this.logger.error('❌ Failed to verify user emails:', error.message);
    }
  }
}
