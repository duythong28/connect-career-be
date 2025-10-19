// services/connect-career-be/src/modules/applications/api/controllers/application.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  ParseIntPipe,
  ParseBoolPipe,
} from '@nestjs/common';
import * as applicationService from '../services/application.service';
import { ApplicationStatus } from '../../domain/entities/application.entity';
import { JwtAuthGuard } from 'src/modules/identity/api/guards/jwt-auth.guard';
import * as decorators from 'src/modules/identity/api/decorators';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('/v1/candidates/applications')
@UseGuards(JwtAuthGuard)
export class ApplicationCandidateController {
  constructor(
    private readonly applicationService: applicationService.ApplicationService,
  ) {}

  @Post()
  create(
    @Body() dto: applicationService.CreateApplicationDto,
    @decorators.CurrentUser() currentUser: decorators.CurrentUserPayload,
  ) {
    return this.applicationService.createApplication(
      dto.SetCandidateId(currentUser.sub),
    );
  }
  @Get('me')
  @ApiOperation({ summary: 'Get my applications with pagination' })
  @ApiResponse({
    status: 200,
    description: 'My applications retrieved successfully with pagination',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getMyApplicationsPaginated(
    @decorators.CurrentUser() currentUser: decorators.CurrentUserPayload,
    @Query('status') status?: ApplicationStatus,
    @Query('source') source?: string,
    @Query('appliedAfter') appliedAfter?: string,
    @Query('appliedBefore') appliedBefore?: string,
    @Query('hasInterviews', ParseBoolPipe) hasInterviews?: boolean,
    @Query('hasOffers', ParseBoolPipe) hasOffers?: boolean,
    @Query('awaitingResponse', ParseBoolPipe) awaitingResponse?: boolean,
    @Query('search') search?: string,
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 20,
    @Query('sortBy') sortBy = 'appliedDate',
    @Query('sortOrder') sortOrder: 'ASC' | 'DESC' = 'DESC',
  ) {
    const filters: applicationService.ApplicationSearchFilters = {
      candidateId: currentUser.sub,
      status,
      source,
      appliedAfter: appliedAfter ? new Date(appliedAfter) : undefined,
      appliedBefore: appliedBefore ? new Date(appliedBefore) : undefined,
      hasInterviews,
      hasOffers,
      awaitingResponse,
      search,
    };

    return this.applicationService.searchApplications(
      filters,
      page,
      limit,
      sortBy,
      sortOrder,
    );
  }

  @Get()
  search(
    @Query('candidateId') candidateId?: string,
    @Query('jobId') jobId?: string,
    @Query('status') status?: ApplicationStatus,
    @Query('source') source?: string,
    @Query('isShortlisted', ParseBoolPipe) isShortlisted?: boolean,
    @Query('isFlagged', ParseBoolPipe) isFlagged?: boolean,
    @Query('minMatchingScore', ParseIntPipe) minMatchingScore?: number,
    @Query('maxMatchingScore', ParseIntPipe) maxMatchingScore?: number,
    @Query('appliedAfter') appliedAfter?: string,
    @Query('appliedBefore') appliedBefore?: string,
    @Query('hasInterviews', ParseBoolPipe) hasInterviews?: boolean,
    @Query('hasOffers', ParseBoolPipe) hasOffers?: boolean,
    @Query('awaitingResponse', ParseBoolPipe) awaitingResponse?: boolean,
    @Query('search') search?: string,
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 20,
    @Query('sortBy') sortBy = 'appliedDate',
    @Query('sortOrder') sortOrder: 'ASC' | 'DESC' = 'DESC',
  ) {
    const filters: applicationService.ApplicationSearchFilters = {
      candidateId,
      jobId,
      status,
      source,
      isShortlisted,
      isFlagged,
      minMatchingScore,
      maxMatchingScore,
      appliedAfter: appliedAfter ? new Date(appliedAfter) : undefined,
      appliedBefore: appliedBefore ? new Date(appliedBefore) : undefined,
      hasInterviews,
      hasOffers,
      awaitingResponse,
      search,
    };
    return this.applicationService.searchApplications(
      filters,
      page,
      limit,
      sortBy,
      sortOrder,
    );
  }

  @Get('stats')
  stats(
    @Query('jobId') jobId?: string,
    @Query('candidateId') candidateId?: string,
  ) {
    const filters: Partial<applicationService.ApplicationSearchFilters> = {};
    if (jobId) filters.jobId = jobId;
    if (candidateId) filters.candidateId = candidateId;
    return this.applicationService.getApplicationStats(filters);
  }

  @Get('needing-attention')
  needingAttention() {
    return this.applicationService.getApplicationsNeedingAttention();
  }

  @Get('by-status/:status')
  byStatus(
    @Param('status') status: ApplicationStatus,
    @Query('limit', ParseIntPipe) limit = 100,
  ) {
    return this.applicationService.getApplicationsByStatus(status, limit);
  }

  @Get('candidates/:candidateId')
  byCandidate(
    @Param('candidateId', ParseUUIDPipe) candidateId: string,
    @Query('status') status?: ApplicationStatus,
    @Query('isShortlisted', ParseBoolPipe) isShortlisted?: boolean,
    @Query('isFlagged', ParseBoolPipe) isFlagged?: boolean,
  ) {
    const filters: Partial<applicationService.ApplicationSearchFilters> = {
      candidateId,
      status,
      isShortlisted,
      isFlagged,
    };
    return this.applicationService.getApplicationsByCandidate(
      candidateId,
      filters,
    );
  }

  @Get('jobs/:jobId')
  byJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Query('status') status?: ApplicationStatus,
    @Query('isShortlisted', ParseBoolPipe) isShortlisted?: boolean,
    @Query('isFlagged', ParseBoolPipe) isFlagged?: boolean,
    @Query('minMatchingScore', ParseIntPipe) minMatchingScore?: number,
  ) {
    const filters: Partial<applicationService.ApplicationSearchFilters> = {
      jobId,
      status,
      isShortlisted,
      isFlagged,
      minMatchingScore,
    };
    return this.applicationService.getApplicationsByJob(jobId, filters);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.applicationService.getApplicationById(id);
  }

  @Get(':id/similar')
  similar(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit', ParseIntPipe) limit = 5,
  ) {
    return this.applicationService.getSimilarApplications(id, limit);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: applicationService.UpdateApplicationDto,
    @decorators.CurrentUser() _u: decorators.CurrentUserPayload,
  ) {
    return this.applicationService.updateApplication(
      id,
      dto,
      _u?.sub || 'system',
    );
  }

  @Put(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: ApplicationStatus; reason?: string },
    @decorators.CurrentUser() _u: decorators.CurrentUserPayload,
  ) {
    return this.applicationService.updateApplicationStatus(
      id,
      body.status,
      _u?.sub || 'system',
      body.reason,
    );
  }

  @Put(':id/shortlist')
  shortlist(
    @Param('id', ParseUUIDPipe) id: string,
    @decorators.CurrentUser() _u: decorators.CurrentUserPayload,
  ) {
    return this.applicationService.shortlistApplication(
      id,
      _u?.sub || 'system',
    );
  }

  @Put(':id/flag')
  flag(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason: string },
    @decorators.CurrentUser() _u: decorators.CurrentUserPayload,
  ) {
    return this.applicationService.flagApplication(
      id,
      body.reason,
      _u?.sub || 'system',
    );
  }

  @Put(':id/assign')
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { assignedToUserId: string },
    @decorators.CurrentUser() _u: decorators.CurrentUserPayload,
  ) {
    return this.applicationService.assignApplication(
      id,
      body.assignedToUserId,
      _u?.sub || 'system',
    );
  }

  @Put(':id/reject')
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason: string; feedback: string },
    @decorators.CurrentUser() _u: decorators.CurrentUserPayload,
  ) {
    return this.applicationService.rejectApplication(
      id,
      body.reason,
      body.feedback,
      _u?.sub || 'system',
    );
  }

  @Put(':id/withdraw')
  withdraw(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason: string },
    @decorators.CurrentUser() _u: decorators.CurrentUserPayload,
  ) {
    return this.applicationService.withdrawApplication(
      id,
      body.reason,
      _u?.sub || 'system',
    );
  }

  @Put('bulk-update')
  bulk(
    @Body()
    body: {
      applicationIds: string[];
      update: applicationService.UpdateApplicationDto;
    },
    @decorators.CurrentUser() _u: decorators.CurrentUserPayload,
  ) {
    return this.applicationService.bulkUpdateApplications(
      body.applicationIds,
      body.update,
      _u?.sub || 'system',
    );
  }

  @Delete(':id')
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @decorators.CurrentUser() _u: decorators.CurrentUserPayload,
  ) {
    await this.applicationService.deleteApplication(id, _u?.sub || 'system');
    return { message: 'Application deleted successfully' };
  }
}
