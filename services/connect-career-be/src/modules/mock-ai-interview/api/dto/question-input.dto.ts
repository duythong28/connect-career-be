import {
  IsObject,
  IsDateString,
  IsString,
  IsEnum,
  IsNumber,
  Min,
  IsOptional,
} from 'class-validator';
import * as interviewConfigurationVo from '../../domain/value-objects/interview-configuration.vo';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for a single question with full metadata to create InterviewQuestion entity
 */
export class QuestionInputDto {
  @ApiProperty({
    description: 'The question text',
    example:
      'Tell me about a time you had to solve a complex technical problem.',
  })
  @IsString()
  question: string;

  @ApiProperty({
    description: 'Type of question',
    enum: interviewConfigurationVo.QuestionType,
    example: interviewConfigurationVo.QuestionType.BEHAVIORAL,
  })
  @IsEnum(interviewConfigurationVo.QuestionType)
  type: interviewConfigurationVo.QuestionType;

  @ApiProperty({
    description: 'Persona/character of the interviewer',
    example: 'Henry',
  })
  @IsString()
  persona: string;

  @ApiProperty({
    description: 'Order/sequence number of the question',
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  order: number;

  @ApiPropertyOptional({
    description: 'Question context (previous answers, follow-up reason, etc.)',
  })
  @IsOptional()
  @IsObject()
  context?: interviewConfigurationVo.QuestionContext;

  @ApiPropertyOptional({
    description: 'Time limit for answering in seconds',
    example: 300,
    minimum: 30,
  })
  @IsOptional()
  @IsNumber()
  @Min(30)
  timeLimit?: number;

  @ApiPropertyOptional({
    description:
      'When this question should be asked (ISO date string). Defaults to now if not provided.',
    example: '2024-01-15T10:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  askedAt?: string;
}
