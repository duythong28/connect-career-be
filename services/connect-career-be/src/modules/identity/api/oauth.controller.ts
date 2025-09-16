import { Controller, Get, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from './decorators/public.decorator';
import { AuthenticationService } from '../core/services/authentication.service';
import * as express from 'express';

@ApiTags('OAuth Authentication')
@Controller('v1/auth/oauth')
export class OAuthController {
  constructor(private readonly authService: AuthenticationService) {}

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirect to Google OAuth' })
  async googleAuth(@Req() req) {
    // This route initiates the Google OAuth flow
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Handle Google OAuth callback' })
  @ApiResponse({ status: 302, description: 'Redirect to frontend with tokens' })
  async googleAuthRedirect(@Req() req, @Res() res: express.Response) {
    try {
      const profile = req.user;
      const deviceInfo = {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      };

      const tokens = await this.authService.handleOAuthLogin(
        profile,
        deviceInfo,
      );

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/auth/callback?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`;

      return res.redirect(redirectUrl);
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const errorUrl = `${frontendUrl}/auth/callback?error=oauth_failed`;
      return res.redirect(errorUrl);
    }
  }

  @Public()
  @Get('github')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'Initiate GitHub OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirect to GitHub OAuth' })
  async githubAuth(@Req() req) {
    // This route initiates the GitHub OAuth flow
  }

  @Public()
  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'Handle GitHub OAuth callback' })
  @ApiResponse({ status: 302, description: 'Redirect to frontend with tokens' })
  async githubAuthRedirect(@Req() req, @Res() res: express.Response) {
    try {
      const profile = req.user;
      const deviceInfo = {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      };

      const tokens = await this.authService.handleOAuthLogin(
        profile,
        deviceInfo,
      );

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/auth/callback?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`;

      return res.redirect(redirectUrl);
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const errorUrl = `${frontendUrl}/auth/callback?error=oauth_failed`;
      return res.redirect(errorUrl);
    }
  }
}
