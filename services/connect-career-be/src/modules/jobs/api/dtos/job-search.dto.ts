import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaginationDto } from 'src/shared/kernel';
import {
  JobSeniorityLevel,
  JobSource,
  JobStatus,
  JobType,
} from '../../domain/entities/job.entity';

export class JobSearchDto extends PaginationDto {
  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsEnum(JobType)
  type?: JobType;

  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus = JobStatus.ACTIVE;

  @IsOptional()
  @IsEnum(JobSeniorityLevel)
  seniorityLevel?: JobSeniorityLevel;

  @IsOptional()
  @IsEnum(JobSource)
  source?: JobSource;

  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  keywords?: string[];

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  minSalary?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  maxSalary?: number;

  @IsOptional()
  @IsString()
  postedAfter?: string; // ISO date string

  @IsOptional()
  @IsString()
  postedBefore?: string; // ISO date string

  @IsOptional()
  @IsString()
  sortBy?: string = 'postedDate';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
