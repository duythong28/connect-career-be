import { IsOptional, IsDateString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum StatsPeriod {
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
  ALL_TIME = 'all_time',
}

export class BackofficeStatsQueryDto {
  @ApiPropertyOptional({ description: 'Start date (ISO format)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO format)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Time period grouping',
    enum: StatsPeriod,
  })
  @IsOptional()
  @IsEnum(StatsPeriod)
  period?: StatsPeriod;
}

export interface BackofficeStatsResponse {
  overview: {
    totalUsers: number;
    totalOrganizations: number;
    totalJobs: number;
    totalApplications: number;
    totalRecruiters: number;
    totalCandidates: number;
    activeJobs: number;
    activeRecruiters: number;
  };
  growth: {
    newUsers: number;
    newOrganizations: number;
    newJobs: number;
    newApplications: number;
    growthRate: {
      users: number;
      organizations: number;
      jobs: number;
    };
  };
  activity: {
    jobsPosted: number;
    applicationsReceived: number;
    interviewsScheduled: number;
    offersSent: number;
    hires: number;
  };
  topPerformers: {
    topOrganizations: Array<{
      id: string;
      name: string;
      jobsPosted: number;
      hires: number;
    }>;
    topRecruiters: Array<{
      id: string;
      name: string;
      email: string;
      organizations: number;
      hires: number;
    }>;
  };
  trends: {
    usersByPeriod: Array<{ period: string; count: number }>;
    jobsByPeriod: Array<{ period: string; count: number }>;
    applicationsByPeriod: Array<{ period: string; count: number }>;
  };
  period: {
    startDate: string;
    endDate: string;
  };
}
