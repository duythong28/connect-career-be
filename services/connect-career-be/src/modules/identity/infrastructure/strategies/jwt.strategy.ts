import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as identityRepository from '../../domain/repository/identity.repository';

export interface JwtPayload {
  sub: string;
  email: string;
  username?: string;
  jti: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: identityRepository.IUserRepository,
    private readonly configService: ConfigService,
  ) {
    // Check if we should ignore expiration in development
    const isDevelopment = configService.get<string>('NODE_ENV') === 'development';
    const unlimitedDev = configService.get<boolean>('JWT_UNLIMITED_DEV');
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: isDevelopment && unlimitedDev,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'your-secret-key',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.userRepository.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Return user info that will be attached to request.user
    return {
      sub: payload.sub,
      email: payload.email,
      username: payload.username,
      jti: payload.jti,
    };
  }
}
