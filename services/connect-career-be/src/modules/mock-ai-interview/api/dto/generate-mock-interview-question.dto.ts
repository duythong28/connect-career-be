import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  Difficulty,
  QuestionType,
} from '../../domain/value-objects/interview-configuration.vo';

export class GenerateSpecificAreasFromJobDescriptionDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  userPrompt: string;

  @ApiPropertyOptional()
  @IsNotEmpty()
  @IsString()
  jobDescription?: string;
}

export class GenerateMockInterviewQuestionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty()
  @IsString()
  customPrompt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  audioEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  realtimeScoring?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  focusAreas?: string[];
}
