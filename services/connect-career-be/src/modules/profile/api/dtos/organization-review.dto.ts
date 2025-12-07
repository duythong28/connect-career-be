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
  MaxLength,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { OvertimePolicySatisfaction } from '../../domain/entities/organization-reviews.entity';

export class RatingDetailsDto {
  @ApiProperty({
    description: 'Salary & benefits rating (1-5)',
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  salaryBenefits: number;

  @ApiProperty({
    description: 'Training & learning rating (1-5)',
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  trainingLearning: number;

  @ApiProperty({
    description: 'Management cares about me rating (1-5)',
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  managementCares: number;

  @ApiProperty({
    description: 'Culture & fun rating (1-5)',
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  cultureFun: number;

  @ApiProperty({
    description: 'Office & workspace rating (1-5)',
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  officeWorkspace: number;
}

export class CreateOrganizationReviewDto {
  @ApiProperty({ description: 'Organization ID' })
  @IsUUID()
  organizationId: string;

  @ApiPropertyOptional({
    description: 'Application ID (if review is related to an application)',
  })
  @IsOptional()
  @IsUUID()
  applicationId?: string;

  @ApiProperty({ description: 'Overall rating (1-5)', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  overallRating: number;

  @ApiProperty({
    description: 'Summary (50-140 characters)',
    minLength: 50,
    maxLength: 140,
  })
  @IsString()
  @MinLength(50)
  @MaxLength(140)
  summary: string;

  @ApiProperty({
    description: 'Overtime policy satisfaction',
    enum: OvertimePolicySatisfaction,
  })
  @IsEnum(OvertimePolicySatisfaction)
  overtimePolicySatisfaction: OvertimePolicySatisfaction;

  @ApiPropertyOptional({
    description: 'Reason for overtime policy satisfaction (50-140 characters)',
    minLength: 50,
    maxLength: 140,
  })
  @IsOptional()
  @IsString()
  @MinLength(50)
  @MaxLength(140)
  overtimePolicyReason?: string;

  @ApiProperty({
    description: 'What makes you love working here (50-10000 characters)',
    minLength: 50,
    maxLength: 10000,
  })
  @IsString()
  @MinLength(50)
  @MaxLength(10000)
  whatMakesYouLoveWorkingHere: string;

  @ApiProperty({
    description: 'Suggestion for improvement (50-10000 characters)',
    minLength: 50,
    maxLength: 10000,
  })
  @IsString()
  @MinLength(50)
  @MaxLength(10000)
  suggestionForImprovement: string;

  @ApiProperty({ description: 'Rating details', type: RatingDetailsDto })
  @ValidateNested()
  @Type(() => RatingDetailsDto)
  @IsObject()
  ratingDetails: RatingDetailsDto;

  @ApiProperty({
    description: 'Would you recommend this company to your friends?',
  })
  @IsBoolean()
  wouldRecommend: boolean;
}

export class UpdateOrganizationReviewDto {
  @ApiPropertyOptional({
    description: 'Overall rating (1-5)',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  overallRating?: number;

  @ApiPropertyOptional({
    description: 'Summary (50-140 characters)',
    minLength: 50,
    maxLength: 140,
  })
  @IsOptional()
  @IsString()
  @MinLength(50)
  @MaxLength(140)
  summary?: string;

  @ApiPropertyOptional({
    description: 'Overtime policy satisfaction',
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    enum: OvertimePolicySatisfaction,
  })
  @IsOptional()
  @IsEnum(OvertimePolicySatisfaction)
  overtimePolicySatisfaction?: OvertimePolicySatisfaction;

  @ApiPropertyOptional({
    description: 'Reason for overtime policy satisfaction (50-140 characters)',
    minLength: 50,
    maxLength: 140,
  })
  @IsOptional()
  @IsString()
  @MinLength(50)
  @MaxLength(140)
  overtimePolicyReason?: string;

  @ApiPropertyOptional({
    description: 'What makes you love working here (50-10000 characters)',
    minLength: 50,
    maxLength: 10000,
  })
  @IsOptional()
  @IsString()
  @MinLength(50)
  @MaxLength(10000)
  whatMakesYouLoveWorkingHere?: string;

  @ApiPropertyOptional({
    description: 'Suggestion for improvement (50-10000 characters)',
    minLength: 50,
    maxLength: 10000,
  })
  @IsOptional()
  @IsString()
  @MinLength(50)
  @MaxLength(10000)
  suggestionForImprovement?: string;

  @ApiPropertyOptional({
    description: 'Rating details',
    type: RatingDetailsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RatingDetailsDto)
  @IsObject()
  ratingDetails?: RatingDetailsDto;

  @ApiPropertyOptional({
    description: 'Would you recommend this company to your friends?',
  })
  @IsOptional()
  @IsBoolean()
  wouldRecommend?: boolean;
}
