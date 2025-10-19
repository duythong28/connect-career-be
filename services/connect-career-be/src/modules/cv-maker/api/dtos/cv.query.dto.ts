import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { CVSource, CVStatus, CVType } from '../../domain/entities/cv.entity';

export class CVQueryDto {
  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsEnum(CVStatus)
  status?: CVStatus;

  @ApiPropertyOptional({ description: 'Filter by type' })
  @IsOptional()
  @IsEnum(CVType)
  type?: CVType;

  @ApiPropertyOptional({ description: 'Filter by source' })
  @IsOptional()
  @IsEnum(CVSource)
  source?: CVSource;

  @ApiPropertyOptional({ description: 'Filter by tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Search query' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  limit?: number = 10;
}

export class ExportCVDto {
  @ApiProperty({ enum: CVType, description: 'Export format' })
  @IsEnum(CVType)
  format: CVType;

  @ApiPropertyOptional({ description: 'HTML template for PDF export' })
  @IsOptional()
  @IsString()
  htmlTemplate?: string;

  @ApiPropertyOptional({ description: 'Export options' })
  @IsOptional()
  @IsObject()
  options?: {
    includePhoto?: boolean;
    pageSize?: 'A4' | 'Letter';
    margins?: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
    theme?: string;
  };
}
