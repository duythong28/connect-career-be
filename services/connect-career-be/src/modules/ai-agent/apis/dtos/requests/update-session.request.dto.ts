import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSessionRequestDto {
  @ApiPropertyOptional({ description: 'Session title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Session metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
