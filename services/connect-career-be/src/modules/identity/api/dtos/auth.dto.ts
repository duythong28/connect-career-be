import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MfaDeviceType } from '../../domain/entities';
import { RoleResponseDto, RoleWithPermissionsDto } from './rbac.dto';

export class LoginDto {
  @ApiProperty({ description: 'Email or username' })
  @IsString()
  identifier: string;

  @ApiProperty({ description: 'Password' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ description: 'MFA code if enabled' })
  @IsOptional()
  @IsString()
  mfaCode?: string;

  @ApiPropertyOptional({ description: 'Device ID for session tracking' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ description: 'Device name for session tracking' })
  @IsOptional()
  @IsString()
  deviceName?: string;
}

export class RegisterDto {
  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Password' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiPropertyOptional({ description: 'Username' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username?: string;

  @ApiPropertyOptional({ description: 'First name' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token' })
  @IsString()
  refreshToken: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'New password' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}
export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ description: 'New password' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}

export class VerifyEmailDto {
  @ApiProperty({ description: 'Email verification token' })
  @IsString()
  token: string;
}

export class SetupMfaDto {
  @ApiProperty({ description: 'MFA device type', enum: MfaDeviceType })
  @IsEnum(MfaDeviceType)
  deviceType: MfaDeviceType;

  @ApiPropertyOptional({ description: 'Device name' })
  @IsOptional()
  @IsString()
  name?: string;
}

export class VerifyMfaSetupDto {
  @ApiProperty({ description: 'MFA device ID' })
  @IsString()
  deviceId: string;

  @ApiProperty({ description: 'Verification code' })
  @IsString()
  code: string;
}

export class AuthTokensResponseDto {
  @ApiProperty({ description: 'Access token' })
  accessToken: string;

  @ApiProperty({ description: 'Refresh token' })
  refreshToken: string;

  @ApiProperty({ description: 'Token expiration time in seconds' })
  expiresIn: number;

  @ApiProperty({ description: 'Token type' })
  tokenType: string;
}

export class MfaSetupResponseDto {
  @ApiProperty({ description: 'MFA secret for TOTP apps' })
  secret: string;

  @ApiProperty({ description: 'QR code URL for easy setup' })
  qrCodeUrl: string;

  @ApiProperty({ description: 'Backup codes', type: [String] })
  backupCodes: string[];
}

export class UserProfileDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiPropertyOptional({ description: 'Candidate Profile' })
  candidateProfileId?: string;

  @ApiProperty({ description: 'Email address' })
  email: string;

  @ApiPropertyOptional({ description: 'Username' })
  username?: string;

  @ApiPropertyOptional({ description: 'First name' })
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  lastName?: string;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  avatar?: string;

  @ApiProperty({ description: 'Email verification status' })
  emailVerified: boolean;

  @ApiProperty({ description: 'MFA enabled status' })
  mfaEnabled: boolean;

  @ApiProperty({ description: 'Account creation date' })
  createdAt: Date;

  @ApiPropertyOptional({
    description: 'User roles',
    type: [RoleResponseDto],
  })
  roles?: RoleWithPermissionsDto[];
}
