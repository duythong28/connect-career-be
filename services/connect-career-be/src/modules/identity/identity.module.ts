import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Domain entities
import {
  User,
  Role,
  Permission,
  UserSession,
  MfaDevice,
  OAuthAccount,
} from './domain/entities';

// Infrastructure repositories
import {
  UserRepository,
  RoleRepository,
  PermissionRepository,
  UserSessionRepository,
  MfaDeviceRepository,
  OAuthAccountRepository,
} from './infrastructure/repositories';

// Core services
import { AuthenticationService } from './core/services/authentication.service';
import { AuthorizationService } from './core/services/authorization.service';

// Infrastructure strategies
import {
  JwtStrategy,
  LocalStrategy,
  GoogleStrategy,
} from './infrastructure/strategies';

// API controllers
import { IdentityController } from './api/identity.controller';
import { RbacController } from './api/rbac.controller';
import { OAuthController } from './api/oauth.controller';

// Guards
import { JwtAuthGuard } from './api/guards/jwt-auth.guard';
import { RolesGuard } from './api/guards/roles.guard';
import { PermissionsGuard } from './api/guards/permissions.guard';

// Configuration
import { jwtConfig } from './infrastructure/config/jwt.config';
import identityConfig from './infrastructure/config/identity.config';

// Infrastructure components
import { IdentityExceptionFilter } from './infrastructure/filters/identity-exception.filter';
import { PasswordValidator } from './infrastructure/validators/password.validator';
import { DefaultRolesSeeder } from './infrastructure/seeders/default-roles.seeder';

// Repository interfaces

@Module({
  imports: [
    ConfigModule.forFeature(identityConfig),
    TypeOrmModule.forFeature([
      User,
      Role,
      Permission,
      UserSession,
      MfaDevice,
      OAuthAccount,
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: jwtConfig,
      inject: [ConfigService],
    }),
  ],
  controllers: [IdentityController, RbacController, OAuthController],
  providers: [
    // Core services
    AuthenticationService,
    AuthorizationService,

    // Infrastructure repositories - use interface tokens
    {
      provide: 'IUserRepository',
      useClass: UserRepository,
    },
    {
      provide: 'IRoleRepository',
      useClass: RoleRepository,
    },
    {
      provide: 'IPermissionRepository',
      useClass: PermissionRepository,
    },
    {
      provide: 'IUserSessionRepository',
      useClass: UserSessionRepository,
    },
    {
      provide: 'IMfaDeviceRepository',
      useClass: MfaDeviceRepository,
    },
    {
      provide: 'IOAuthAccountRepository',
      useClass: OAuthAccountRepository,
    },

    // Authentication strategies
    JwtStrategy,
    LocalStrategy,
    GoogleStrategy,

    // Guards
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,

    // Infrastructure components
    IdentityExceptionFilter,
    PasswordValidator,
    DefaultRolesSeeder,
  ],
  exports: [
    AuthenticationService,
    AuthorizationService,
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
    PasswordValidator,
    DefaultRolesSeeder,
  ],
})
export class IdentityModule {}
