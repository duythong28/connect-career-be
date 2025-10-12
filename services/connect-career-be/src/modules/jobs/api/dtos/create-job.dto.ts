import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsNumber,
  ValidateNested,
  MinLength,
  MaxLength,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  JobType,
  JobSeniorityLevel,
  JobStatus,
} from '../../domain/entities/job.entity';

export class SalaryDetailsDto {
  @ApiProperty({ description: 'Currency code (e.g., VND, USD)' })
  @IsString()
  currency: string;

  @ApiProperty({ description: 'Minimum salary amount' })
  @IsNumber()
  minAmount: number;

  @ApiProperty({ description: 'Maximum salary amount' })
  @IsNumber()
  maxAmount: number;

  @ApiProperty({ description: 'Payment period (e.g., monthly, yearly)' })
  @IsString()
  paymentPeriod: string;
}

export class CreateJobDto {
  @ApiProperty({ description: 'Job title' })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiProperty({ description: 'Job description' })
  @IsString()
  @MinLength(10)
  description: string;

  @ApiPropertyOptional({ description: 'Job summary' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiProperty({ description: 'Job location' })
  @IsString()
  location: string;

  @ApiPropertyOptional({ description: 'Country code' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiProperty({
    description: 'Job type',
    enum: JobType,
    default: JobType.FULL_TIME,
  })
  @IsEnum(JobType)
  type: JobType;

  @ApiPropertyOptional({
    description: 'Seniority level',
    enum: JobSeniorityLevel,
  })
  @IsOptional()
  @IsEnum(JobSeniorityLevel)
  seniorityLevel?: JobSeniorityLevel;

  @ApiPropertyOptional({ description: 'Job function/department' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobFunction?: string;

  @ApiPropertyOptional({ description: 'Salary description' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  salary?: string;

  @ApiPropertyOptional({
    description: 'Detailed salary information',
    type: SalaryDetailsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SalaryDetailsDto)
  salaryDetails?: SalaryDetailsDto;

  @ApiPropertyOptional({ description: 'Salary standards' })
  @IsOptional()
  @IsString()
  salaryStandards?: string;

  @ApiPropertyOptional({ description: 'External application link' })
  @IsOptional()
  @IsString()
  applyLink?: string;

  @ApiPropertyOptional({ description: 'Application availability info' })
  @IsOptional()
  @IsString()
  applicationAvailability?: string;

  @ApiPropertyOptional({
    description: 'Job status',
    enum: JobStatus,
    default: JobStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @ApiPropertyOptional({ description: 'Job keywords' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({
    description: 'Company name (if different from organization)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @ApiPropertyOptional({ description: 'Company URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  companyUrl?: string;

  @ApiPropertyOptional({ description: 'Company logo URL' })
  @IsOptional()
  @IsString()
  companyLogo?: string;

  @ApiPropertyOptional({ description: 'Posted date' })
  @IsOptional()
  @IsDate()
  postedDate?: Date;
}
