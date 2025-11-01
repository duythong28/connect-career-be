import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  Difficulty,
  InterviewSessionStatus,
  QuestionType,
} from '../../domain/value-objects/interview-configuration.vo';
import { QuestionInputDto } from './question-input.dto';

export class CreateMockInterviewDto {
  @ApiPropertyOptional({
    description: 'Optional name for the interview session',
    example: 'Senior Software Engineer Mock Interview',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Custom prompt to guide the AI interviewer',
    example:
      'Conduct a technical interview focused on system design and algorithms',
    required: true,
  })
  @IsString()
  customPrompt: string;

  @ApiPropertyOptional({
    description: 'Job description to provide context for the interview',
    example:
      'We are looking for a senior engineer with 5+ years of experience...',
  })
  @IsOptional()
  @IsString()
  jobDescription?: string;

  @ApiPropertyOptional({
    description: 'ID of the interviewer agent (AI agent)',
    example: 'agent-uuid-here',
  })
  @IsOptional()
  @IsUUID()
  interviewerAgentId?: string;

  @ApiPropertyOptional({
    description: 'Initial status of the interview session',
    enum: InterviewSessionStatus,
    default: InterviewSessionStatus.CREATED,
  })
  @IsOptional()
  @IsEnum(InterviewSessionStatus)
  status?: InterviewSessionStatus;

  @ApiPropertyOptional({
    description: 'Duration of the interview in minutes',
    example: 60,
    minimum: 15,
    maximum: 180,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  duration?: number;

  @ApiPropertyOptional({
    description: 'Types of questions to include',
    enum: QuestionType,
    isArray: true,
    example: [QuestionType.TECHNICAL, QuestionType.BEHAVIORAL],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(QuestionType, { each: true })
  questionTypes?: QuestionType[];

  @ApiPropertyOptional({
    description: 'Difficulty level of the interview',
    enum: Difficulty,
    example: Difficulty.INTERMEDIATE,
    default: Difficulty.INTERMEDIATE,
  })
  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;

  @ApiPropertyOptional({
    description: 'Areas to focus on during the interview',
    example: ['system design', 'algorithms', 'communication'],
    isArray: true,
    default: [],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  focusAreas?: string[];

  @ApiPropertyOptional({
    description: 'Enable audio recording and responses',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  audioEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Enable real-time scoring during the interview',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  realtimeScoring?: boolean;

  @ApiPropertyOptional({
    description: 'Optional start date/time for scheduling (ISO string)',
    example: '2024-01-15T10:00:00Z',
  })
  @IsOptional()
  @IsString()
  scheduledStartAt?: string;

  @ApiProperty({
    description:
      'Array of generated question strings from /questions/generate endpoint',
    example: [
      'Tell me about yourself.',
      'What is your experience with system design?',
      'Describe a challenging project you worked on.',
    ],
    required: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  questions: QuestionInputDto[];
}
