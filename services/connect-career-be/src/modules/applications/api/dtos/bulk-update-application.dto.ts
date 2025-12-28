import {
  IsArray,
  IsOptional,
  IsEnum,
  IsString,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStatus } from '../../domain/entities/application.entity';

class UpdateApplicationDto {
  @ApiPropertyOptional({ enum: ApplicationStatus })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isShortlisted?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFlagged?: boolean;
}

export class BulkUpdateApplicationDto {
  @ApiProperty({
    description: 'Array of application IDs to update',
  })
  @IsOptional()
  applicationIds?: string[];

  @ApiProperty({ description: 'Update data' })
  @IsOptional()
  update?: UpdateApplicationDto;
}
