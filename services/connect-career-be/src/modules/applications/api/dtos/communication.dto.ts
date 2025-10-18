import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export class LogCommunicationDto {
  @ApiProperty({ enum: ['email', 'phone', 'meeting', 'sms'] })
  @IsEnum(['email', 'phone', 'meeting', 'sms'])
  type: 'email' | 'phone' | 'meeting' | 'sms';

  @ApiProperty({ enum: ['inbound', 'outbound'] })
  @IsEnum(['inbound', 'outbound'])
  direction: 'inbound' | 'outbound';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty()
  @IsString()
  loggedBy: string;
}

export class CommunicationLogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  direction: string;

  @ApiPropertyOptional()
  subject?: string;

  @ApiPropertyOptional()
  content?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  timestamp: Date;

  @ApiProperty()
  loggedBy: string;
}
