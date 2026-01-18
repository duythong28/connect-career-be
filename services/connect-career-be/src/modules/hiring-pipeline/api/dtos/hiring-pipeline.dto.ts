// services/connect-career-be/src/modules/hiring-pipeline/api/dtos/hiring-pipeline.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { PipelineStageType } from '../../domain/entities/pipeline-stage.entity';
import { Type } from 'class-transformer';

export class CreatePipelineDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsUUID()
  organizationId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdatePipelineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;
}

export class AssignJobToPipelineDto {
  @ApiProperty()
  @IsUUID()
  jobId: string;
}

export class RemoveJobFromPipelineDto {
  @ApiProperty()
  @IsUUID()
  jobId: string;
}
export class CreateStageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: PipelineStageType })
  @IsEnum(PipelineStageType)
  type: PipelineStageType;

  @ApiProperty()
  @IsInt()
  order: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  terminal?: boolean;
}

export class UpdateStageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  key?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: PipelineStageType })
  @IsOptional()
  @IsEnum(PipelineStageType)
  type?: PipelineStageType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  terminal?: boolean;
}

export class UpdateStageInPipelineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: PipelineStageType })
  @IsEnum(PipelineStageType)
  type: PipelineStageType;

  @ApiProperty()
  @IsInt()
  order: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  terminal?: boolean;
}

export class UpdateTransitionInPipelineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty()
  @IsString()
  fromStageKey: string;

  @ApiProperty()
  @IsString()
  toStageKey: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actionName?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  allowedRoles?: string[];
}
export class UpdatePipelineComprehensiveDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({ type: [UpdateStageInPipelineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateStageInPipelineDto)
  stages: UpdateStageInPipelineDto[];

  @ApiProperty({ type: [UpdateTransitionInPipelineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateTransitionInPipelineDto)
  transitions: UpdateTransitionInPipelineDto[];
}

export class ReorderStagesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  stageIdsInOrder: string[];
}

export class CreateTransitionDto {
  @ApiProperty()
  @IsString()
  fromStageKey: string;

  @ApiProperty()
  @IsString()
  toStageKey: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actionName?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  allowedRoles?: string[];
}

export class UpdateTransitionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fromStageKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  toStageKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actionName?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  allowedRoles?: string[];
}

export class PipelineValidationResultDto {
  @ApiProperty() valid: boolean;
  @ApiProperty({ type: [String] }) issues: string[];
}

export class CreatePipelineComprehensiveDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsUUID()
  organizationId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({ type: [CreateStageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStageDto)
  stages: CreateStageDto[];

  @ApiProperty({ type: [CreateTransitionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTransitionDto)
  transitions: CreateTransitionDto[];
}

export class GeneratePipelineWithAIDto {
  @ApiPropertyOptional({
    description: 'User input describing the pipeline requirements',
    example:
      'Create a standard hiring pipeline for software engineers with phone screening, technical interview, and offer stage',
  })
  @IsOptional()
  @IsString()
  userInput?: string =
    `\n\nGenerate a hiring pipeline based on the job information provided.`;

  @ApiPropertyOptional({
    description: 'Job title for which the pipeline is being created',
    example: 'Senior Software Engineer',
  })
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @ApiPropertyOptional({
    description:
      'Job description to help AI generate more relevant pipeline stages',
    example:
      'We are looking for a Senior Software Engineer with 5+ years of experience in React, Node.js, and TypeScript...',
  })
  @IsOptional()
  @IsString()
  jobDescription?: string;
  @ApiPropertyOptional({
    description: 'Allowed roles for transitions',
    type: [String],
    default: ['hr_manager', 'recruiter', 'owner'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedRoles?: string[] = ['hr_manager', 'recruiter', 'owner'];
}
