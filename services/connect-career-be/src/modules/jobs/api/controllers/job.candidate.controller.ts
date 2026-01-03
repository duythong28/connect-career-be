import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  ParseIntPipe,
  Body,
  Put,
  Delete,
} from '@nestjs/common';
import { JobService } from '../services/job.service';
import { JobSearchDto } from '../dtos/search-job.dto';
import * as decorators from 'src/modules/identity/api/decorators';
import { JwtAuthGuard } from 'src/modules/identity/api/guards/jwt-auth.guard';
import { SavedJobService } from '../services/saved-job.service';
import { SaveJobDto, UpdateSavedJobDto } from '../dtos/saved-job.dto';
import { GetJobsByIdsDto } from '../dtos/get-jobs-by-ids.dto';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('/v1/candidates/jobs/')
export class JobCandidateController {
  constructor(
    private readonly savedJobService: SavedJobService,
    private readonly jobService: JobService,
  ) {}

  @Get()
  @decorators.Public()
  async searchJobs(@Query() searchDto: JobSearchDto) {
    return this.jobService.searchJobs(searchDto);
  }

  @Get('stats')
  @decorators.Public()
  async getJobStats() {
    return this.jobService.getJobStats();
  }

  @Get('latest')
  @decorators.Public()
  async getLatestJobs(@Query('limit', ParseIntPipe) limit: number = 10) {
    return this.jobService.getLatestJobs(limit);
  }

  @Get('featured')
  @decorators.Public()
  async getFeaturedJobs(@Query('limit', ParseIntPipe) limit: number = 10) {
    return this.jobService.getFeaturedJobs(limit);
  }

  @Get('locations')
  @decorators.Public()
  async getJobLocations() {
    return this.jobService.getJobLocations();
  }

  @Get('keywords')
  @decorators.Public()
  async getJobKeywords() {
    return this.jobService.getJobKeywords();
  }

  @Get('search/keyword')
  @decorators.Public()
  async searchByKeyword(
    @Query('q') keyword: string,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
    return this.jobService.searchByKeywords(keyword, limit);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyJobs(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.jobService.getJobsByUserId(user.sub);
  }

  @Get('organizations/:organizationId')
  @decorators.Public()
  async getJobsByOrganization(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.jobService.getJobsByOrganization(organizationId);
  }

  @Get('company/:companyName/count')
  @decorators.Public()
  async getCompanyJobsCount(@Param('companyName') companyName: string) {
    const count = await this.jobService.getCompanyJobsCount(companyName);
    return { companyName, count };
  }

  @Get('saved')
  async getSavedJobs(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 20,
    @Query('folder') folderName?: string,
  ) {
    return this.savedJobService.getSavedJobs(user.sub, page, limit, folderName);
  }

  @Get(':id/similar')
  @decorators.Public()
  async getSimilarJobs(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit', ParseIntPipe) limit: number = 5,
  ) {
    return this.jobService.getSimilarJobs(id, limit);
  }

  @Get(':id')
  @decorators.Public()
  async getJobById(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobService.getJobById(id);
  }

  @Post(':id/apply')
  @decorators.Public()
  async applyToJob(@Param('id', ParseUUIDPipe) id: string) {
    await this.jobService.incrementApplications(id);
    return {
      success: true,
      message: 'Application recorded successfully',
    };
  }

  @Post(':id/view')
  @decorators.Public()
  async viewJob(@Param('id', ParseUUIDPipe) id: string) {
    await this.jobService.incrementViews(id);
    return {
      success: true,
      message: 'View recorded successfully',
    };
  }

  @Post('saved')
  async saveJob(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
    @Body() dto: SaveJobDto,
  ) {
    return this.savedJobService.saveJob(
      user.sub,
      dto.jobId,
      dto.notes,
      dto.folderName,
    );
  }

  @Get('saved/folders')
  async getSavedJobFolders(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.savedJobService.getSavedJobFolders(user.sub);
  }

  @Put('saved/:id')
  async updateSavedJob(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
    @Param('id', ParseUUIDPipe) savedJobId: string,
    @Body() dto: UpdateSavedJobDto,
  ) {
    return this.savedJobService.updateSavedJob(
      user.sub,
      savedJobId,
      dto.notes,
      dto.folderName,
    );
  }

  @Delete('saved/:jobId')
  async unsaveJob(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ) {
    await this.savedJobService.unsaveJob(user.sub, jobId);
    return { message: 'Job unsaved successfully' };
  }

  @Get(':jobId/is-saved')
  async isJobSaved(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ) {
    const isSaved = await this.savedJobService.isSaved(user.sub, jobId);
    return { jobId, isSaved };
  }

  @Post(':jobId/favorite')
  async favoriteJob(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ) {
    return this.savedJobService.favoriteJob(user.sub, jobId);
  }

  @Get('favorites')
  async getFavoriteJobs(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 20,
  ) {
    return this.savedJobService.getFavoriteJobs(user.sub, page, limit);
  }

  @Delete(':jobId/favorite')
  async unfavoriteJob(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ) {
    await this.savedJobService.unfavoriteJob(user.sub, jobId);
    return { message: 'Job unfavorited successfully' };
  }

  @Get(':jobId/is-favorited')
  async isJobFavorited(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ) {
    const isFavorited = await this.savedJobService.isFavorited(user.sub, jobId);
    return { jobId, isFavorited };
  }

  @Get(':jobId/status')
  async getJobInteractionStatus(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ) {
    return this.savedJobService.getJobInteractionStatus(user.sub, jobId);
  }

  @Get('my/stats')
  async getUserJobStats(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.savedJobService.getUserJobStats(user.sub);
  }

  @Post('by-ids')
  @decorators.Public()
  @ApiOperation({ summary: 'Get jobs by a list of job IDs' })
  @ApiResponse({
    status: 200,
    description: 'Jobs retrieved successfully',
  })
  async getJobsByIds(@Body() dto: GetJobsByIdsDto) {
    if (!dto.ids || dto.ids.length === 0) {
      return [];
    }
    return this.jobService.getJobsByIds(dto.ids);
  }
}
