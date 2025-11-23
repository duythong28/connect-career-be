import { IsOptional, IsEnum, IsString, IsInt, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { InterviewSessionStatus } from '../../domain/value-objects/interview-configuration.vo';

export class ListMockInterviewQueryDto {
  @ApiPropertyOptional({ enum: InterviewSessionStatus })
  @IsOptional()
  @IsEnum(InterviewSessionStatus)
  status?: InterviewSessionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  createdBefore?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  completedAfter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  completedBefore?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}