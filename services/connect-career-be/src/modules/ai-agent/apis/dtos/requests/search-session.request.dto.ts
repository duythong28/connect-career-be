import { IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SearchSessionRequestDto {
  @ApiPropertyOptional({
    description: 'Maximum number of sessions to return',
    default: 50,
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'Number of sessions to skip',
    default: 0,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  offset?: number = 0;

  @ApiPropertyOptional({ description: 'Search term to filter sessions' })
  @IsString()
  @IsOptional()
  search_term?: string;
}
