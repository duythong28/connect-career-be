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

@Controller('/v1/organizations')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

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
}
