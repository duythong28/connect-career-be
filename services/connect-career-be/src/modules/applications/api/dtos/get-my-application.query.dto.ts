import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { PipelineStageType } from 'src/modules/hiring-pipeline/domain/entities/pipeline-stage.entity';

export class GetMyApplicationsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by pipeline stage',
    enum: PipelineStageType,
  })
  @IsOptional()
  @IsEnum(PipelineStageType)
  stage?: PipelineStageType;

  @ApiPropertyOptional({ description: 'Filter by application source' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({
    description: 'Filter applications applied after this date (ISO date string)',
  })
  @IsOptional()
  @IsString()
  appliedAfter?: string;

  @ApiPropertyOptional({
    description: 'Filter applications applied before this date (ISO date string)',
  })
  @IsOptional()
  @IsString()
  appliedBefore?: string;

  @ApiPropertyOptional({
    description: 'Filter applications that have interviews',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasInterviews?: boolean;

  @ApiPropertyOptional({
    description: 'Filter applications that have offers',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasOffers?: boolean;

  @ApiPropertyOptional({
    description: 'Filter applications awaiting response',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  awaitingResponse?: boolean;

  @ApiPropertyOptional({
    description: 'Search term for applications',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 20,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    default: 'appliedDate',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'appliedDate';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}