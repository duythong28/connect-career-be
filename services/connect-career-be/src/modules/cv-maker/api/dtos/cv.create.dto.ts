import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { CVType } from '../../domain/entities/cv.entity';
import { Type } from 'class-transformer';

export class CreateCVDto {
  @ApiProperty({ description: 'CV title' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ description: 'CV description' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ enum: CVType, description: 'CV file type' })
  @IsEnum(CVType)
  type: CVType;

  @ApiPropertyOptional({ description: 'Is this CV a template?' })
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @ApiPropertyOptional({ description: 'Is this CV public?' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'CV tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UploadCVDto extends CreateCVDto {
  @ApiProperty({ description: 'file ID from upload CV file' })
  @IsUUID()
  fileId: string;
}

export class CVContentDto {
  @ApiPropertyOptional({ description: 'Personal information' })
  @IsOptional()
  @IsObject()
  personalInfo?: {
    name?: string;
    title?: string;
    email?: string;
    phone?: string;
    address?: string;
    linkedin?: string;
    github?: string;
    website?: string;
    avatar?: string;
  };

  @ApiPropertyOptional({ description: 'Professional summary' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ description: 'Work experience' })
  @IsOptional()
  @IsArray()
  @Type(() => Object) // Add this
  workExperience?: Array<{
    id: string;
    company: string;
    position: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    description?: string;
    responsibilities?: string[];
    technologies?: string[];
    achievements?: string[];
  }>;

  @ApiPropertyOptional({ description: 'Education background' })
  @IsOptional()
  @IsArray()
  @Type(() => Object) // Add this
  education?: Array<{
    id: string;
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startDate: string;
    endDate?: string;
    gpa?: number | string;
    honors?: string[];
  }>;

  @ApiPropertyOptional({ description: 'Projects' })
  @IsOptional()
  @IsArray()
  @Type(() => Object) // Add this
  projects?: Array<{
    id: string;
    name?: string;
    title?: string;
    description: string;
    startDate: string;
    endDate?: string;
    current?: boolean;
    technologies?: string[];
    techStack?: string[];
    responsibilities?: string[];
    url?: string;
    github?: string;
  }>;

  @ApiPropertyOptional({ description: 'Awards' })
  @IsOptional()
  @IsArray()
  @Type(() => Object) // Add this
  awards?: Array<{
    id: string;
    title: string;
    date: string;
    description: string;
  }>;

  @ApiPropertyOptional({ description: 'Custom sections' })
  @IsOptional()
  @IsArray()
  customSections?: Array<{
    id: string;
    title: string;
    content: string;
    order: number;
  }>;
}
