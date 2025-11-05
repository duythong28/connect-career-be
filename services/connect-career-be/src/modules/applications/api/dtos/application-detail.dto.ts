import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApplicationStatus } from '../../domain/entities/application.entity';

export class CandidateSnapshotDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  currentTitle?: string;

  @ApiPropertyOptional()
  currentCompany?: string;

  @ApiPropertyOptional()
  yearsOfExperience?: number;

  @ApiPropertyOptional()
  expectedSalary?: number;

  @ApiPropertyOptional()
  noticePeriod?: string;

  @ApiProperty()
  location: string;

  @ApiPropertyOptional()
  avatarUrl?: string;
}

export class ApplicationDetailResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  jobId: string;

  @ApiProperty()
  candidateId: string;

  @ApiProperty({ enum: ApplicationStatus })
  status: ApplicationStatus;

  @ApiProperty()
  appliedDate: Date;

  @ApiPropertyOptional()
  cvId?: string;

  @ApiPropertyOptional()
  coverLetter?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  matchingScore: number;

  @ApiPropertyOptional({ type: CandidateSnapshotDto })
  candidateSnapshot?: CandidateSnapshotDto;

  @ApiProperty()
  isFlagged: boolean;

  @ApiPropertyOptional()
  flagReason?: string;

  @ApiPropertyOptional({ type: [String] })
  tags?: string[];

  @ApiPropertyOptional()
  assignedToUserId?: string;

  @ApiPropertyOptional()
  customFields?: Record<string, any>;

  @ApiProperty()
  daysSinceApplied: number;

  @ApiProperty()
  daysInCurrentStatus: number;

  @ApiPropertyOptional()
  lastStatusChange?: Date;

  @ApiPropertyOptional({ type: [Object] })
  statusHistory?: any[];

  @ApiPropertyOptional({ type: [Object] })
  interviews?: any[];

  @ApiPropertyOptional({ type: [Object] })
  offers?: any[];

  @ApiPropertyOptional({ type: [Object] })
  communicationLogs?: any[];
}

export class ChangeApplicationStageDto {
  @ApiProperty()
  @IsString()
  stageKey: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateApplicationNotesDto {
  @ApiProperty()
  @IsString()
  notes: string;

  @ApiProperty()
  @IsString()
  updatedBy: string;
}

export class FlagApplicationDto {
  @ApiProperty()
  @IsString()
  reason: string;

  @ApiProperty()
  @IsString()
  flaggedBy: string;
}

export class UpdateApplicationTagsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  tags: string[];

  @ApiProperty()
  @IsString()
  updatedBy: string;
}
