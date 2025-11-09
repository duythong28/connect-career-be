import { IsOptional, IsDateString, IsUUID, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum HiringMetricsPeriod {
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
  CUSTOM = 'custom',
}

export class HiringEffectivenessQueryDto {
  @ApiPropertyOptional({ description: 'Start date for metrics (ISO format)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for metrics (ISO format)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter by specific job ID' })
  @IsOptional()
  @IsUUID()
  jobId?: string;

  @ApiPropertyOptional({
    description: 'Time period grouping',
    enum: HiringMetricsPeriod,
  })
  @IsOptional()
  @IsEnum(HiringMetricsPeriod)
  period?: HiringMetricsPeriod;

  @ApiPropertyOptional({ description: 'Include comparison with previous period' })
  @IsOptional()
  compareWithPrevious?: boolean;
}

// src/modules/profile/api/dtos/hiring-effectiveness-response.dto.ts
export interface TimeToHireMetrics {
  average: number; // days
  median: number;
  min: number;
  max: number;
  byJob: Array<{
    jobId: string;
    jobTitle: string;
    averageDays: number;
    count: number;
  }>;
  bySource: Array<{
    source: string;
    averageDays: number;
    count: number;
  }>;
  trend: Array<{
    period: string;
    averageDays: number;
    count: number;
  }>;
}

export interface ConversionRateMetrics {
  applicationToInterview: number; // percentage
  interviewToOffer: number;
  offerToHire: number;
  overallFunnel: number;
  byStage: Array<{
    stageName: string;
    fromStage: string;
    toStage: string;
    conversionRate: number;
    count: number;
  }>;
  bySource: Array<{
    source: string;
    applicationToInterview: number;
    interviewToOffer: number;
    offerToHire: number;
  }>;
}

export interface SourceEffectivenessMetrics {
  sources: Array<{
    source: string;
    totalApplications: number;
    totalHires: number;
    hireRate: number; // percentage
    averageMatchingScore: number;
    averageTimeToHire: number; // days
    costPerHire?: number; // if cost data available
  }>;
  topPerformingSources: string[];
}

export interface PipelineMetrics {
  stageMetrics: Array<{
    stageName: string;
    stageKey: string;
    averageTimeInStage: number; // days
    candidatesInStage: number;
    conversionToNext: number; // percentage
    dropOffRate: number; // percentage
  }>;
  bottlenecks: Array<{
    stageName: string;
    averageTime: number;
    reason: string; // e.g., "High drop-off rate"
  }>;
}

export interface BaseQueryConditions {
  organizationId: string;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  jobId?: string;
}

 

export interface HiringEffectivenessSummary {
  overview: {
    totalApplications: number;
    totalInterviews: number;
    totalOffers: number;
    totalHires: number;
    activeJobs: number;
    activeCandidates: number;
  };
  timeMetrics: TimeToHireMetrics;
  conversionRates: ConversionRateMetrics;
  sourceEffectiveness: SourceEffectivenessMetrics;
  pipelineMetrics: PipelineMetrics;
  qualityMetrics: {
    averageMatchingScore: number;
    averageMatchingScoreOfHires: number;
    offerAcceptanceRate: number;
    interviewCompletionRate: number;
    averageInterviewsPerHire: number;
  };
  period: {
    startDate: string;
    endDate: string;
  };
  comparison?: {
    previousPeriod: Partial<HiringEffectivenessSummary>;
    changes: {
      timeToHire: { change: number; percentage: number };
      conversionRate: { change: number; percentage: number };
      totalHires: { change: number; percentage: number };
    };
  };
}