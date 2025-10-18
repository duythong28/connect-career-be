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
} from 'class-validator';
import { PipelineStageType } from '../../domain/entities/pipeline-stage.entity';

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
