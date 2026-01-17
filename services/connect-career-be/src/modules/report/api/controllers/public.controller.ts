import { Controller, Get, Query, HttpStatus, HttpCode } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { Public } from "src/modules/identity/api/decorators";
import { QueryBus } from "@nestjs/cqrs";
import { GetIndustryStatisticQuery } from "../applications/queries/get-industry-statistic.query";
import { GetJobOpportunityGrowthQuery } from "../applications/queries/get-job-opportunity-growth.query";
import { IndustryStatisticItem } from "../services/industry.statistic.service";
import { JobOpportunityGrowthItem, JobStatisticService } from "../services/job.statis.service";

@ApiTags('Reports - Public')
@Controller('/v1/public/reports')
@Public()
export class PublicReportController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly jobStatisticService: JobStatisticService,
  ) {}

  @Get('industry-statistics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get industry statistics by date range' })
  @ApiQuery({
    name: 'startDate',
    required: true,
    type: String,
    description: 'Start date in ISO format (YYYY-MM-DD)',
    example: '2025-12-18',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    type: String,
    description: 'End date in ISO format (YYYY-MM-DD)',
    example: '2026-01-17',
  })
  @ApiQuery({
    name: 'industryId',
    required: false,
    type: String,
    description: 'Optional industry ID to filter by',
  })
  @ApiResponse({
    status: 200,
    description: 'Industry statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        message: { type: 'string', example: '' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string', example: '18/12/2025' },
              value: { type: 'string', example: '50129' },
            },
          },
        },
      },
    },
  })
  async getIndustryStatistics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('industryId') industryId?: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const query = new GetIndustryStatisticQuery(start, end, industryId);
    const data = await this.queryBus.execute<GetIndustryStatisticQuery, IndustryStatisticItem[]>(query);

    return {
      status: 'success',
      message: '',
      data,
    };
  }

  @Get('job-opportunity-growth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get job opportunity growth statistics by date' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date in ISO format (YYYY-MM-DD). If not provided, returns all data.',
    example: '2025-12-27',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date in ISO format (YYYY-MM-DD). If not provided, returns all data.',
    example: '2026-01-12',
  })
  @ApiResponse({
    status: 200,
    description: 'Job opportunity growth statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        message: { type: 'string', example: '' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string', example: '27/12/2025' },
              value: { type: 'string', example: '4' },
            },
          },
        },
      },
    },
  })
  async getJobOpportunityGrowth(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const query = new GetJobOpportunityGrowthQuery(start, end);
    const data = await this.queryBus.execute<GetJobOpportunityGrowthQuery, JobOpportunityGrowthItem[]>(query);

    return {
      status: 'success',
      message: '',
      data,
    };
  }

  @Get('work-market')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get work market statistics' })
  @ApiResponse({
    status: 200,
    description: 'Work market statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        message: { type: 'string', example: '' },
        data: {
          type: 'object',
          properties: {
            quantity_job_recruitment: { type: 'number', example: 41812 },
            quantity_job_recruitment_yesterday: { type: 'number', example: 42473 },
            quantity_job_new_today: { type: 'number', example: 1950 },
            quantity_company_recruitment: { type: 'number', example: 13806 },
            time_scan: { type: 'string', example: '11:30 17/01/2026' },
          },
        },
      },
    },
  })
  async getWorkMarket() {
    const data = await this.jobStatisticService.getWorkMarketStatistics();

    return {
      status: 'success',
      message: '',
      data,
    };
  }
}