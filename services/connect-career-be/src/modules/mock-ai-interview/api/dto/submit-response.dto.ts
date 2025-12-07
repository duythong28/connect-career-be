import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class SubmitResponseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  textResponse?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  audioUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  duration?: number;
}
