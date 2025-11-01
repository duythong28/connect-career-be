import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import {
  InterviewStatus,
} from 'src/modules/applications/domain/entities/interview.entity';
import {
  OfferStatus,
} from 'src/modules/applications/domain/entities/offer.entity';

export class CandidateInterviewsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by interview status',
    enum: InterviewStatus,
  })
  @IsOptional()
  @IsEnum(InterviewStatus)
  status?: InterviewStatus;

  @ApiPropertyOptional({
    description: 'Filter interviews from this date (ISO date string)',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter interviews until this date (ISO date string)',
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by application ID',
  })
  @IsOptional()
  @IsUUID()
  applicationId?: string;

  @ApiPropertyOptional({
    description: 'Filter by job ID',
  })
  @IsOptional()
  @IsUUID()
  jobId?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class CandidateOffersQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by offer status',
    enum: OfferStatus,
  })
  @IsOptional()
  @IsEnum(OfferStatus)
  status?: OfferStatus;

  @ApiPropertyOptional({
    description: 'Filter by application ID',
  })
  @IsOptional()
  @IsUUID()
  applicationId?: string;

  @ApiPropertyOptional({
    description: 'Filter by job ID',
  })
  @IsOptional()
  @IsUUID()
  jobId?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
