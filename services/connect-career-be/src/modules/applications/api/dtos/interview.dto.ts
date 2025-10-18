import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  IsArray,
} from 'class-validator';
import { InterviewType } from '../../domain/entities/interview.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInterviewDto {
  @ApiProperty()
  @IsString()
  interviewerName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  interviewerEmail?: string;

  @ApiProperty()
  @IsDateString()
  scheduledDate: string;

  @ApiProperty({ enum: InterviewType })
  @IsEnum(InterviewType)
  type: InterviewType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  interviewRound?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meetingLink?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateInterviewDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  interviewerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  interviewerEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiPropertyOptional({ enum: InterviewType })
  @IsOptional()
  @IsEnum(InterviewType)
  type?: InterviewType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  interviewRound?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  meetingLink?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class SubmitInterviewFeedbackDto {
  @ApiProperty()
  @IsNumber()
  rating: number;

  @ApiProperty({
    enum: ['strongly_recommend', 'recommend', 'neutral', 'not_recommend'],
  })
  @IsEnum(['strongly_recommend', 'recommend', 'neutral', 'not_recommend'])
  recommendation:
    | 'strongly_recommend'
    | 'recommend'
    | 'neutral'
    | 'not_recommend';

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  strengths?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  weaknesses?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiProperty()
  @IsString()
  submittedBy: string;
}

export class RescheduleInterviewDto {
  @ApiProperty()
  @IsDateString()
  newScheduledDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty()
  @IsString()
  rescheduledBy: string;
}
