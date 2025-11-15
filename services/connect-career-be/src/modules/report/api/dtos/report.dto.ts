import {
  IsString,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  MaxLength,
  MinLength,
  IsUUID,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ReportableEntityType,
  ReportStatus,
  ReportPriority,
  UserReportReason,
  OrganizationReportReason,
  JobReportReason,
  ReviewReportReason,
  FeedbackReportReason,
  ApplicationReportReason,
  InterviewReportReason,
  OfferReportReason,
  CVReportReason,
} from '../../domain/entities/report.entity';

// Helper function to get reasons for entity type
export function getReasonsForEntityType(
  entityType: ReportableEntityType,
): string[] {
  switch (entityType) {
    case ReportableEntityType.USER:
      return Object.values(UserReportReason);
    case ReportableEntityType.ORGANIZATION:
      return Object.values(OrganizationReportReason);
    case ReportableEntityType.JOB:
      return Object.values(JobReportReason);
    case ReportableEntityType.ORGANIZATION_REVIEW:
      return Object.values(ReviewReportReason);
    case ReportableEntityType.RECRUITER_FEEDBACK:
      return Object.values(FeedbackReportReason);
    case ReportableEntityType.APPLICATION:
      return Object.values(ApplicationReportReason);
    case ReportableEntityType.INTERVIEW:
      return Object.values(InterviewReportReason);
    case ReportableEntityType.OFFER:
      return Object.values(OfferReportReason);
    case ReportableEntityType.CV:
      return Object.values(CVReportReason);
    default:
      return ['other'];
  }
}

export class CreateReportDto {
  @ApiProperty({
    description: 'Type of entity being reported',
    enum: ReportableEntityType,
    example: ReportableEntityType.JOB,
  })
  @IsEnum(ReportableEntityType)
  @IsNotEmpty()
  entityType: ReportableEntityType;

  @ApiProperty({
    description: 'ID of the entity being reported',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  entityId: string;

  @ApiProperty({
    description: 'Reason for reporting (must match the entity type)',
    example: 'fake_job',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({
    description: 'Subject of the report',
    example: 'Fake job posting detected',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @MinLength(5)
  subject: string;

  @ApiProperty({
    description: 'Detailed description of the issue',
    example:
      'This job posting appears to be fake and is asking for payment upfront.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description: string;

  @ApiPropertyOptional({
    description: 'Priority level of the report',
    enum: ReportPriority,
    default: ReportPriority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(ReportPriority)
  priority?: ReportPriority;

  @ApiPropertyOptional({
    description: 'Additional metadata about the report',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateReportDto {
  @ApiPropertyOptional({
    description: 'Update the status of the report',
    enum: ReportStatus,
  })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @ApiPropertyOptional({
    description: 'Admin notes or internal comments',
    example: 'Issue verified, entity has been removed',
  })
  @IsOptional()
  @IsString()
  adminNotes?: string;

  @ApiPropertyOptional({
    description: 'ID of admin user assigned to handle this report',
  })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({
    description: 'Resolution details when resolving the report',
    example: 'Reported entity has been removed from the platform',
  })
  @IsOptional()
  @IsString()
  resolution?: string;

  @ApiPropertyOptional({
    description: 'Priority level',
    enum: ReportPriority,
  })
  @IsOptional()
  @IsEnum(ReportPriority)
  priority?: ReportPriority;
}

export class ReportListQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by entity type',
    enum: ReportableEntityType,
  })
  @IsOptional()
  @IsEnum(ReportableEntityType)
  entityType?: ReportableEntityType;

  @ApiPropertyOptional({
    description: 'Filter by entity ID',
  })
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ReportStatus,
  })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @ApiPropertyOptional({
    description: 'Filter by priority',
    enum: ReportPriority,
  })
  @IsOptional()
  @IsEnum(ReportPriority)
  priority?: ReportPriority;

  @ApiPropertyOptional({
    description: 'Filter by reporter ID',
  })
  @IsOptional()
  @IsUUID()
  reporterId?: string;

  @ApiPropertyOptional({
    description: 'Filter by assigned admin ID',
  })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({
    description: 'Search in subject or description',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
  })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 20,
  })
  @IsOptional()
  limit?: number;
}
