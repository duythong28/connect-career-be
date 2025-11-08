import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class IndustryQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  limit?: number = 10;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Search term for industry name' })
  search?: string;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ description: 'Filter by parent industry ID' })
  parentId?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  @ApiPropertyOptional({
    description: 'Filter only parent industries',
    default: false,
  })
  parentsOnly?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  @ApiPropertyOptional({
    description: 'Filter only active industries',
    default: true,
  })
  isActive?: boolean = true;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Sort field', default: 'sortOrder' })
  sortBy?: string = 'sortOrder';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    default: 'ASC',
  })
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}
