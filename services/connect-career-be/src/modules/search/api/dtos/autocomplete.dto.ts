import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum AutocompleteType {
  ALL = 'all',
  JOBS = 'jobs',
  ORGANIZATIONS = 'organizations',
}

export class AutocompleteDto {
  @ApiProperty({
    description: 'Search query for autocomplete',
    example: 'software',
    required: true,
  })
  @IsString()
  q: string;

  @ApiPropertyOptional({
    description: 'Type of autocomplete suggestions',
    enum: AutocompleteType,
    default: AutocompleteType.ALL,
  })
  @IsOptional()
  @IsEnum(AutocompleteType)
  type?: AutocompleteType = AutocompleteType.ALL;

  @ApiPropertyOptional({
    description: 'Maximum number of suggestions to return',
    default: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  size?: number = 10;
}

