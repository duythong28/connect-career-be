import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateCVDto, CVContentDto } from './cv.create.dto';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CVStatus } from '../../domain/entities/cv.entity';

export class CreateCVFromTemplateDto extends CreateCVDto {
  @ApiPropertyOptional({ description: 'Template ID to use' })
  @IsOptional()
  @IsUUID()
  templateId: string;

  @ApiPropertyOptional({ description: 'CV content data' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CVContentDto)
  content?: CVContentDto;

  @ApiPropertyOptional({ description: 'Builder configuration' })
  @IsOptional()
  @IsObject()
  builderData?: {
    version: string;
    theme: string;
    layout: string;
    colors: Record<string, string>;
    fonts: Record<string, string>;
    sections: string[];
    customizations: Record<string, any>;
  };
}

export class UpdateCVDto {
  @ApiPropertyOptional({ description: 'CV title' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: 'CV description' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: CVStatus, description: 'CV status' })
  @IsOptional()
  @IsEnum(CVStatus)
  status?: CVStatus;

  @ApiPropertyOptional({ description: 'Is this CV public?' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'CV tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'CV content data' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CVContentDto)
  content?: CVContentDto;

  @ApiPropertyOptional({ description: 'Builder configuration' })
  @IsOptional()
  @IsObject()
  builderData?: {
    version: string;
    theme: string;
    layout: string;
    colors: Record<string, string>;
    fonts: Record<string, string>;
    sections: string[];
    customizations: Record<string, any>;
  };
  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}
