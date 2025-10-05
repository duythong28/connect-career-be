import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { JobService } from '../services/job.service';
import { JobSearchDto } from '../dtos/job-search.dto';
import * as decorators from 'src/modules/identity/api/decorators';
import { JwtAuthGuard } from 'src/modules/identity/api/guards/jwt-auth.guard';

@Controller('/v1/jobs')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  /**
   * Search jobs with advanced filters
   * GET /api/v1/jobs?search=engineer&location=remote&type=full_time&page=1&limit=20
   */
  @Get()
  @decorators.Public()
  async searchJobs(@Query() searchDto: JobSearchDto) {
    return this.jobService.searchJobs(searchDto);
  }

  /**
   * Get job statistics and analytics
   * GET /api/v1/jobs/stats
   */
  @Get('stats')
  @decorators.Public()
  async getJobStats() {
    return this.jobService.getJobStats();
  }

  /**
   * Get latest jobs
   * GET /api/v1/jobs/latest?limit=10
   */
  @Get('latest')
  @decorators.Public()
  async getLatestJobs(@Query('limit', ParseIntPipe) limit: number = 10) {
    return this.jobService.getLatestJobs(limit);
  }

  /**
   * Get featured/popular jobs
   * GET /api/v1/jobs/featured?limit=10
   */
  @Get('featured')
  @decorators.Public()
  async getFeaturedJobs(@Query('limit', ParseIntPipe) limit: number = 10) {
    return this.jobService.getFeaturedJobs(limit);
  }

  /**
   * Get unique job locations for filters
   * GET /api/v1/jobs/locations
   */
  @Get('locations')
  @decorators.Public()
  async getJobLocations() {
    return this.jobService.getJobLocations();
  }

  /**
   * Get unique job keywords for filters
   * GET /api/v1/jobs/keywords
   */
  @Get('keywords')
  @decorators.Public()
  async getJobKeywords() {
    return this.jobService.getJobKeywords();
  }

  /**
   * Search jobs by keyword (autocomplete)
   * GET /api/v1/jobs/search/keyword?q=python&limit=10
   */
  @Get('search/keyword')
  @decorators.Public()
  async searchByKeyword(
    @Query('q') keyword: string,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
    return this.jobService.searchByKeywords(keyword, limit);
  }

  /**
   * Get jobs posted by current user
   * GET /api/v1/jobs/me
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyJobs(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.jobService.getJobsByUserId(user.sub);
  }

  /**
   * Get jobs by organization
   * GET /api/v1/jobs/organization/:organizationId
   */
  @Get('organization/:organizationId')
  @decorators.Public()
  async getJobsByOrganization(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.jobService.getJobsByOrganization(organizationId);
  }

  /**
   * Get company jobs count
   * GET /api/v1/jobs/company/:companyName/count
   */
  @Get('company/:companyName/count')
  @decorators.Public()
  async getCompanyJobsCount(@Param('companyName') companyName: string) {
    const count = await this.jobService.getCompanyJobsCount(companyName);
    return { companyName, count };
  }

  /**
   * Get similar jobs
   * GET /api/v1/jobs/:id/similar?limit=5
   */
  @Get(':id/similar')
  @decorators.Public()
  async getSimilarJobs(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit', ParseIntPipe) limit: number = 5,
  ) {
    return this.jobService.getSimilarJobs(id, limit);
  }

  /**
   * Get job details by ID
   * GET /api/v1/jobs/:id
   */
  @Get(':id')
  @decorators.Public()
  async getJobById(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobService.getJobById(id);
  }

  /**
   * Apply to a job (increments application count)
   * POST /api/v1/jobs/:id/apply
   */
  @Post(':id/apply')
  @decorators.Public()
  async applyToJob(@Param('id', ParseUUIDPipe) id: string) {
    await this.jobService.incrementApplications(id);
    return {
      success: true,
      message: 'Application recorded successfully',
    };
  }

  /**
   * Increment job views (called when viewing job details)
   * POST /api/v1/jobs/:id/view
   */
  @Post(':id/view')
  @decorators.Public()
  async viewJob(@Param('id', ParseUUIDPipe) id: string) {
    await this.jobService.incrementViews(id);
    return {
      success: true,
      message: 'View recorded successfully',
    };
  }
}
