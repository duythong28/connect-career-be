import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

export const jwtConfig = (configService: ConfigService): JwtModuleOptions => ({
  secret:
    configService.get<string>('JWT_SECRET') ||
    'your-secret-key-change-in-production',
  signOptions: {
    expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '15m',
    issuer: configService.get<string>('JWT_ISSUER') || 'connect-career',
    audience:
      configService.get<string>('JWT_AUDIENCE') || 'connect-career-users',
  },
});
