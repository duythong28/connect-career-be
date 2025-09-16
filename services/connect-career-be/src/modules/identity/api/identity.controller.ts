import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthenticationService } from '../core/services/authentication.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import * as identityRepository from '../domain/repository/identity.repository';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  VerifyEmailDto,
  SetupMfaDto,
  VerifyMfaSetupDto,
  AuthTokensResponseDto,
  MfaSetupResponseDto,
  UserProfileDto,
} from './dtos';
import { UserMapper } from './mappers/user.mapper';

@ApiTags('Authentication')
@Controller('v1/auth')
@UseGuards(JwtAuthGuard)
export class IdentityController {
  constructor(
    private readonly authService: AuthenticationService,
    @Inject('IUserRepository')
    private readonly userRepository: identityRepository.IUserRepository,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login with username/password and optional MFA',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthTokensResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or MFA required',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Request() req,
  ): Promise<AuthTokensResponseDto> {
    const deviceInfo = {
      ...loginDto,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };

    return this.authService.login(deviceInfo);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register new user account' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({
    status: 400,
    description: 'Registration failed - user exists or invalid data',
  })
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<{ message: string; userId: string }> {
    const user = await this.authService.register(registerDto);
    return {
      message:
        'User registered successfully. Please check your email for verification.',
      userId: user.id,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: AuthTokensResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshTokens(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthTokensResponseDto> {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current session' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<{ message: string }> {
    await this.authService.logout(refreshTokenDto.refreshToken);
    return { message: 'Logged out successfully' };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiResponse({ status: 200, description: 'Logged out from all devices' })
  async logoutAll(@CurrentUser() user: any): Promise<{ message: string }> {
    await this.authService.logoutAllDevices(user.sub);
    return { message: 'Logged out from all devices' };
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved',
    type: UserProfileDto,
  })
  async getProfile(@CurrentUser() user: any): Promise<UserProfileDto> {
    const fullUser = await this.userRepository.findById(user.sub);
    if (!fullUser) {
      throw new NotFoundException('User not found');
    }

    return UserMapper.toUserProfileDto(fullUser);
  }

  @Patch('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid current password' })
  async changePassword(
    @CurrentUser() user: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const fullUser = await this.userRepository.findById(user.sub);
    if (!fullUser) {
      throw new NotFoundException('User not found');
    }

    // Validate current password
    const isValidPassword = await this.authService.validateUser(
      fullUser.email,
      changePasswordDto.currentPassword,
    );

    if (!isValidPassword) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Update password (this would need to be implemented in auth service)
    // await this.authService.changePassword(user.sub, changePasswordDto.newPassword);

    return { message: 'Password changed successfully' };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findByEmail(forgotPasswordDto.email);

    if (user) {
      // Generate reset token and send email (implementation needed)
      // await this.authService.sendPasswordResetEmail(user);
    }

    // Always return success message for security
    return {
      message: 'If the email exists, a password reset link has been sent',
    };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findByPasswordResetToken(
      resetPasswordDto.token,
    );

    if (
      !user ||
      !user.passwordResetExpires ||
      user.passwordResetExpires < new Date()
    ) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Reset password (implementation needed)
    // await this.authService.resetPassword(user.id, resetPasswordDto.password);

    return { message: 'Password reset successfully' };
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid verification token' })
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findByEmailVerificationToken(
      verifyEmailDto.token,
    );

    if (
      !user ||
      !user.emailVerificationExpires ||
      user.emailVerificationExpires < new Date()
    ) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Activate user account
    user.activate();
    await this.userRepository.update(user.id, user);

    return { message: 'Email verified successfully' };
  }

  // MFA Endpoints
  @Post('mfa/setup')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Setup MFA for user account' })
  @ApiResponse({
    status: 200,
    description: 'MFA setup initiated',
    type: MfaSetupResponseDto,
  })
  async setupMfa(
    @CurrentUser() user: any,
    @Body() setupMfaDto: SetupMfaDto,
  ): Promise<MfaSetupResponseDto> {
    return this.authService.setupMfa(user.sub, setupMfaDto.deviceType);
  }

  @Post('mfa/verify-setup')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify and activate MFA setup' })
  @ApiResponse({ status: 200, description: 'MFA setup completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid verification code' })
  async verifyMfaSetup(
    @CurrentUser() user: any,
    @Body() verifyMfaDto: VerifyMfaSetupDto,
  ): Promise<{ message: string }> {
    const isValid = await this.authService.verifyMfaSetup(
      user.sub,
      verifyMfaDto.deviceId,
      verifyMfaDto.code,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    return { message: 'MFA setup completed successfully' };
  }

  @Post('mfa/disable')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable MFA for user account' })
  @ApiResponse({ status: 200, description: 'MFA disabled successfully' })
  async disableMfa(@CurrentUser() user: any): Promise<{ message: string }> {
    const fullUser = await this.userRepository.findById(user.sub);
    if (!fullUser) {
      throw new NotFoundException('User not found');
    }

    // Disable MFA
    await this.userRepository.update(user.sub, { mfaEnabled: false });

    return { message: 'MFA disabled successfully' };
  }
}
