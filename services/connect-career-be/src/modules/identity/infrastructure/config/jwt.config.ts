import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

export const jwtConfig = (configService: ConfigService): JwtModuleOptions => {
  const isDevelopment = configService.get<string>('NODE_ENV') === 'development';
  const expiresIn =
    isDevelopment && configService.get<boolean>('JWT_UNLIMITED_DEV')
      ? undefined // Unlimited token in development
      : configService.get<string>('JWT_EXPIRES_IN') || '15m';

  return {
    secret:
      configService.get<string>('JWT_SECRET') ||
      'your-secret-key-change-in-production',
    signOptions: {
      expiresIn,
      issuer: configService.get<string>('JWT_ISSUER') || 'connect-career',
      audience:
        configService.get<string>('JWT_AUDIENCE') || 'connect-career-users',
    },
  };
};
