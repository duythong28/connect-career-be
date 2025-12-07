import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';

export class RegisterPushTokenDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty({ enum: ['fcm', 'apns', 'web'] })
  @IsEnum(['fcm', 'apns', 'web'])
  platform: 'fcm' | 'apns' | 'web';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceName?: string;
}