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
  education?: Array<{
    id: string;
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startDate: string;
    endDate?: string;
    gpa?: number | string; // NEW: Accept both number and string (e.g., "9.13/10")
    honors?: string[];
  }>;

  @ApiPropertyOptional({ description: 'Skills - can be object or array' })
  @IsOptional()
  skills?:
    | {
        technical: string[];
        soft: string[];
        languages: Array<{
          language: string;
          proficiency: 'beginner' | 'intermediate' | 'advanced' | 'native';
        }>;
      }
    | string[]; // NEW: Support flat array format

  @ApiPropertyOptional({ description: 'Certifications' })
  @IsOptional()
  @IsArray()
  certifications?: Array<{
    id: string;
    name: string;
    issuer: string;
    issueDate: string;
    expiryDate?: string;
    credentialId?: string;
    url?: string;
  }>;

  @ApiPropertyOptional({ description: 'Projects' })
  @IsOptional()
  @IsArray()
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
