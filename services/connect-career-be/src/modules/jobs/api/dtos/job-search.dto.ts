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
  @Transform(({ value }) => {
    if (value == null) return undefined;
    if (typeof value === 'string') {
      const s = value.trim();
      console.log(s, typeof s);
      if (s.startsWith('[') && s.endsWith(']')) {
        try {
          const arr = JSON.parse(s);
          return Array.isArray(arr) ? arr.map(x => String(x).trim()).filter(Boolean) : undefined;
        } catch { /* ignore */ }
      }
      if (Array.isArray(value)) return value;
      return s.split(',').map(x => x.trim()).filter(Boolean);
    }
    return undefined;
  })
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
  postedAfter?: string;

  @IsOptional()
  @IsString()
  postedBefore?: string;

  @IsOptional()
  @IsString()
  sortBy?: string = 'postedDate';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
