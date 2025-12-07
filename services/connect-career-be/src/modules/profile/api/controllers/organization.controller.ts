import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrganizationService } from '../services/organization.service';
import { JwtAuthGuard } from 'src/modules/identity/api/guards/jwt-auth.guard';
import * as decorators from 'src/modules/identity/api/decorators';
import { CreateOrganizationDto } from '../dtos/create-organization.dto';
import { CurrentUser, Public } from 'src/modules/identity/api/decorators';
import {
  OrganizationInterviewsQueryDto,
  OrganizationQueryDto,
  OrganizationSearchDto,
  OrganizationUpcomingInterviewsQueryDto,
} from '../dtos/organization-query.dto';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { UpdateOrganizationDto } from '../dtos/update-organization.dto';
import { HiringEffectivenessQueryDto } from '../dtos/hiring-effectiveness.dto';
import { OrganizationHiringAnalyticsService } from '../services/organization-hiring-analytics.service';
import { RecruiterDashboardQueryDto } from '../dtos/recruiter-dashboard.dto';
import { RecruiterDashboardService } from '../services/recruiter-dashboard.service';

@Controller('/v1/organizations')
export class OrganizationController {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly hiringAnalyticsService: OrganizationHiringAnalyticsService,
    private readonly recruiterDashboardService: RecruiterDashboardService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createOrganization(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.organizationService.createOrganization(
      user.sub,
      createOrganizationDto,
    );
  }

  @Get()
  @Public()
  async getAllOrganizations(@Query() query: OrganizationQueryDto) {
    return this.organizationService.getAllOrganizations(query);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyOrganization(@CurrentUser() user: decorators.CurrentUserPayload) {
    return this.organizationService.getMyOrganizations(user.sub);
  }

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Advanced search for organizations' })
  @ApiResponse({
    status: 200,
    description: 'Search results with filters applied',
  })
  async searchOrganizations(@Query() searchDto: OrganizationSearchDto) {
    return this.organizationService.searchOrganizations(searchDto);
  }

  @Get('search/quick')
  @Public()
  @ApiOperation({
    summary: 'Quick search for autocomplete (returns minimal data)',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Search term' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Max results (default: 10)',
  })
  async quickSearch(
    @Query('q') searchTerm: string,
    @Query('limit') limit?: string,
  ) {
    const maxResults = limit ? parseInt(limit, 10) : 10;
    return this.organizationService.quickSearch(searchTerm, maxResults);
  }

  @Get(':organizationId/interviews')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all interviews for an organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Interviews retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getOrganizationInterviews(
    @Param('organizationId', ParseUUIDPipe) id: string,
    @Query() query: OrganizationInterviewsQueryDto,
  ) {
    return this.organizationService.getInterviewsByOrganization(id, {
      status: query.status,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      jobId: query.jobId,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':id/interviews/upcoming')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get upcoming interviews for an organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Upcoming interviews retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getUpcomingOrganizationInterviews(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: OrganizationUpcomingInterviewsQueryDto,
  ) {
    return this.organizationService.getUpcomingInterviewsByOrganization(id, {
      daysAhead: query.daysAhead,
      jobId: query.jobId,
      limit: query.limit,
    });
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get organization by ID' })
  async getOrganizationById(@Param('id') id: string) {
    return this.organizationService.getOrganizationById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateOrganization(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.organizationService.updateOrganizationById(
      user.sub,
      id,
      updateOrganizationDto,
    );
  }

  @Get(':id/hiring-effectiveness')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      'Get comprehensive hiring effectiveness metrics for an organization',
  })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Hiring effectiveness metrics retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getHiringEffectiveness(
    @Param('id', ParseUUIDPipe) organizationId: string,
    @Query() query: HiringEffectivenessQueryDto,
  ) {
    return this.hiringAnalyticsService.getHiringEffectiveness(
      organizationId,
      query,
    );
  }

  @Get(':id/hiring-effectiveness/summary')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get quick summary of key hiring metrics' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  async getHiringSummary(
    @Param('id', ParseUUIDPipe) organizationId: string,
    @Query() query: HiringEffectivenessQueryDto,
  ) {
    const fullMetrics =
      await this.hiringAnalyticsService.getHiringEffectiveness(
        organizationId,
        query,
      );
    return {
      overview: fullMetrics.overview,
      keyMetrics: {
        averageTimeToHire: fullMetrics.timeMetrics.average,
        overallConversionRate: fullMetrics.conversionRates.overallFunnel,
        offerAcceptanceRate: fullMetrics.qualityMetrics.offerAcceptanceRate,
        topSource: fullMetrics.sourceEffectiveness.topPerformingSources[0],
      },
    };
  }
  @Get('recruiters/dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get recruiter dashboard with all work and company information',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
  })
  async getRecruiterDashboard(
    @CurrentUser() user: decorators.CurrentUserPayload,
    @Query() query: RecruiterDashboardQueryDto,
  ) {
    return this.recruiterDashboardService.getRecruiterDashboard(
      user.sub,
      query,
    );
  }

  @Get('recruiters/dashboard/my-work')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get only my work summary' })
  async getMyWork(
    @CurrentUser() user: decorators.CurrentUserPayload,
    @Query() query: RecruiterDashboardQueryDto,
  ) {
    const dashboard =
      await this.recruiterDashboardService.getRecruiterDashboard(
        user.sub,
        query,
      );
    return dashboard.myWork;
  }

  @Get('recruiters/dashboard/upcoming-tasks')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get upcoming tasks and reminders' })
  async getUpcomingTasks(
    @CurrentUser() user: decorators.CurrentUserPayload,
    @Query() query: RecruiterDashboardQueryDto,
  ) {
    const dashboard =
      await this.recruiterDashboardService.getRecruiterDashboard(
        user.sub,
        query,
      );
    return dashboard.upcomingTasks;
  }
}
