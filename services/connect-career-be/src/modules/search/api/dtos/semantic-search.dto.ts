import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SemanticSearchDto {
  @ApiProperty({
    description: 'Search query text for semantic search',
    example: 'Looking for a senior software engineer role in machine learning',
  })
  @IsString()
  q: string;

  @ApiPropertyOptional({
    description: 'Minimum similarity threshold (0-1)',
    default: 0.5,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  minSimilarity?: number = 0.5;

  @ApiPropertyOptional({
    description: 'Maximum number of results to return',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;
}

export class SemanticJobSearchResult {
  @ApiProperty({ description: 'Job ID' })
  id: string;

  @ApiProperty({ description: 'Job title' })
  title: string;

  @ApiProperty({ description: 'Similarity score (0-1)' })
  similarity: number;

  @ApiProperty({ description: 'Job details', required: false })
  job?: any;
}

export class SemanticPeopleSearchResult {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'User name' })
  name: string;

  @ApiProperty({ description: 'Similarity score (0-1)' })
  similarity: number;

  @ApiProperty({ description: 'User details', required: false })
  user?: any;
}

