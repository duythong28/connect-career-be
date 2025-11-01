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
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as applicationService from '../services/application.service';
import { ApplicationStatus } from '../../domain/entities/application.entity';
import { JwtAuthGuard } from 'src/modules/identity/api/guards/jwt-auth.guard';
import * as decorators from 'src/modules/identity/api/decorators';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateOfferCandidateDto } from '../dtos/offer.dto';
import { OfferService } from '../services/offer.service';
import { PipelineStageType } from 'src/modules/hiring-pipeline/domain/entities/pipeline-stage.entity';
import { GetMyApplicationsQueryDto } from '../dtos/get-my-application.query.dto';
import { InterviewService } from '../services/interview.service';

@Controller('/v1/candidates/applications')
@UseGuards(JwtAuthGuard)
export class ApplicationCandidateController {
  constructor(
    private readonly applicationService: applicationService.ApplicationService,
    private readonly interviewService: InterviewService,
    private readonly offerService: OfferService,
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
    @Query() query: GetMyApplicationsQueryDto,
  ) {
    const filters: applicationService.ApplicationSearchFilters = {
      candidateId: currentUser.sub,
      stage: query.stage,
      source: query.source,
      appliedAfter: query.appliedAfter ? new Date(query.appliedAfter) : undefined,
      appliedBefore: query.appliedBefore ? new Date(query.appliedBefore) : undefined,
      hasInterviews: query.hasInterviews,
      hasOffers: query.hasOffers,
      awaitingResponse: query.awaitingResponse,
      search: query.search,
    };

    return this.applicationService.searchApplications(
      filters,
      query.page ?? 1,
      query.limit ?? 20,
      query.sortBy ?? 'appliedDate',
      query.sortOrder ?? 'DESC',
    );
  }

  @Get('me/:applicationId/interviews')
  @ApiOperation({ summary: 'Get interviews for my application' })
  @ApiResponse({ status: 200, description: 'Interviews retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  @ApiResponse({ status: 403, description: 'Application does not belong to candidate' })
  async getInterviewsByApplication(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @decorators.CurrentUser() currentUser: decorators.CurrentUserPayload,
  ) {
    // Verify application belongs to candidate
    const application = await this.applicationService.getApplicationById(applicationId);
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    if (application.candidateId !== currentUser.sub) {
      throw new ForbiddenException('Application does not belong to candidate');
    }
    
    return this.interviewService.getInterviewsByApplication(applicationId);
  }
  
  // Fix method 2: getInterviewsDetail (lines 86-92)
  @Get('me/:applicationId/interviews/:interviewId')
  @ApiOperation({ summary: 'Get interview detail for my application' })
  @ApiResponse({ status: 200, description: 'Interview retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Interview not found' })
  @ApiResponse({ status: 403, description: 'Interview does not belong to candidate\'s application' })
  async getInterviewsDetail(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('interviewId', ParseUUIDPipe) interviewId: string,
    @decorators.CurrentUser() currentUser: decorators.CurrentUserPayload,
  ) {
    // Verify application belongs to candidate
    const application = await this.applicationService.getApplicationById(applicationId);
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    if (application.candidateId !== currentUser.sub) {
      throw new ForbiddenException('Application does not belong to candidate');
    }
    
    // Get interview and verify it belongs to the application
    const interview = await this.interviewService.getInterviewById(interviewId);
    if (!interview || interview.applicationId !== applicationId) {
      throw new NotFoundException('Interview not found');
    }
    
    return interview;
  }
  
  // Fix method 3: getOffersByApplication (lines 94-100)
  @Get('me/:applicationId/offers')
  @ApiOperation({ summary: 'Get offers for my application' })
  @ApiResponse({ status: 200, description: 'Offers retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  @ApiResponse({ status: 403, description: 'Application does not belong to candidate' })
  async getOffersByApplication(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @decorators.CurrentUser() currentUser: decorators.CurrentUserPayload,
  ) {
    const application = await this.applicationService.getApplicationById(applicationId);
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    if (application.candidateId !== currentUser.sub) {
      throw new ForbiddenException('Application does not belong to candidate');
    }
    
    return this.offerService.getOffersByApplication(applicationId);
  }

  @Get()
  search(
    @Query('candidateId') candidateId?: string,
    @Query('jobId') jobId?: string,
    @Query('stage') stage?: PipelineStageType,
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
      stage,
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
  ) {
    const filters: Partial<applicationService.ApplicationSearchFilters> = {
      jobId,
      status,
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

  @Post(':applicationId/offer')
  @ApiOperation({ summary: 'Create new offer for application (candidate)' })
  @ApiResponse({ status: 201, description: 'Offer created successfully' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  @ApiResponse({
    status: 403,
    description: 'Application does not belong to candidate',
  })
  async createOffer(
    @Param('id', ParseUUIDPipe) applicationId: string,
    @Body() createOfferDto: CreateOfferCandidateDto,
    @decorators.CurrentUser() currentUser: decorators.CurrentUserPayload,
  ) {
    return await this.offerService.createCounterOffer(
      applicationId,
      createOfferDto,
      currentUser.sub,
    );
  }

}
