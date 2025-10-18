import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import {
  AuthenticationService,
  OAuthProfile,
} from '../../core/services/authentication.service';
import { AuthProvider } from '../../domain/entities';

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthenticationService,
  ) {
    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID'),
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GITHUB_CALLBACK_URL'),
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: Function,
  ): Promise<any> {
    const { id, username, displayName, emails, photos } = profile;
    const oauthProfile: OAuthProfile = {
      provider: AuthProvider.GITHUB,
      providerId: id,
      email: emails?.[0]?.value || `${username}@github.local`,
      firstName: displayName?.split(' ')[0] || username,
      lastName: displayName?.split(' ').slice(1).join(' ') || '',
      avatar: photos?.[0]?.value,
      accessToken,
      refreshToken,
    };
    try {
      const tokens = await this.authService.handleOAuthLogin(oauthProfile);
      done(null, { tokens, profile: oauthProfile });
    } catch (error) {
      done(error, null);
    }
  }
}
