import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-linkedin-oauth2';
import { ConfigService } from '@nestjs/config';
import {
  AuthenticationService,
  OAuthProfile,
} from '../../core/services/authentication.service';
import { AuthProvider } from '../../domain/entities';

@Injectable()
export class LinkedInStrategy extends PassportStrategy(Strategy, 'linkedin') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthenticationService,
  ) {
    super({
      clientID: configService.get<string>('LINKEDIN_CLIENT_ID'),
      clientSecret: configService.get<string>('LINKEDIN_CLIENT_SECRET'),
      callbackURL:
        configService.get<string>('LINKEDIN_CALLBACK_URL') ||
        '/v1/auth/oauth/linkedin/callback',
      scope: ['r_emailaddress', 'r_liteprofile'],
      state: true,
      passReqToCallback: false,
      profileFields: ['id', 'first-name', 'last-name', 'emails', 'picture-url'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: Function,
  ): Promise<any> {
    const { id, name, emails, photos } = profile as any;

    const email =
      emails?.[0]?.value ||
      (name?.givenName
        ? `${name.givenName}.${name?.familyName || 'user'}@linkedin.local`
        : `user_${id}@linkedin.local`);

    const oauthProfile: OAuthProfile = {
      provider: AuthProvider.LINKEDIN,
      providerId: id,
      email,
      firstName: name?.givenName,
      lastName: name?.familyName,
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
