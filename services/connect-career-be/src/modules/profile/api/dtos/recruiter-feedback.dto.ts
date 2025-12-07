import {
  IsString,
  IsInt,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsUUID,
  Min,
  Max,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecruiterFeedbackType } from '../../domain/entities/recruiter-feedbacks.entity';

export class CreateRecruiterFeedbackDto {
  @ApiProperty({ description: 'Recruiter User ID' })
  @IsUUID()
  recruiterUserId: string;

  @ApiPropertyOptional({
    description: 'Application ID (if feedback is related to an application)',
  })
  @IsOptional()
  @IsUUID()
  applicationId?: string;

  @ApiPropertyOptional({
    description: 'Interview ID (if feedback is related to an interview)',
  })
  @IsOptional()
  @IsUUID()
  interviewId?: string;

  @ApiProperty({
    description: 'Feedback type',
    enum: RecruiterFeedbackType,
    default: RecruiterFeedbackType.GENERAL,
  })
  @IsEnum(RecruiterFeedbackType)
  feedbackType: RecruiterFeedbackType;

  @ApiPropertyOptional({ description: 'Rating (1-5)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiProperty({ description: 'Feedback content', minLength: 10 })
  @IsString()
  @MinLength(10)
  feedback: string;

  @ApiPropertyOptional({ description: 'Is this feedback positive?' })
  @IsOptional()
  @IsBoolean()
  isPositive?: boolean;
}

export class UpdateRecruiterFeedbackDto {
  @ApiPropertyOptional({
    description: 'Feedback type',
    enum: RecruiterFeedbackType,
  })
  @IsOptional()
  @IsEnum(RecruiterFeedbackType)
  feedbackType?: RecruiterFeedbackType;

  @ApiPropertyOptional({ description: 'Rating (1-5)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ description: 'Feedback content', minLength: 10 })
  @IsOptional()
  @IsString()
  @MinLength(10)
  feedback?: string;

  @ApiPropertyOptional({ description: 'Is this feedback positive?' })
  @IsOptional()
  @IsBoolean()
  isPositive?: boolean;
}
