import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ApplicationService } from '../services/application.service';
import { ApplicationStatusService } from '../services/application-status.service';
import { InterviewService } from '../services/interview.service';
import { OfferService } from '../services/offer.service';
import { CommunicationService } from '../services/communication.service';
import {
  ApplicationDetailResponseDto,
  ChangeApplicationStageDto,
  UpdateApplicationNotesDto,
  FlagApplicationDto,
  UpdateApplicationTagsDto,
} from '../dtos/application-detail.dto';
import {
  CreateInterviewDto,
  UpdateInterviewDto,
  SubmitInterviewFeedbackDto,
  RescheduleInterviewDto,
} from '../dtos/interview.dto';
import {
  CreateOfferDto,
  UpdateOfferDto,
  RecordOfferResponseDto,
} from '../dtos/offer.dto';
import { LogCommunicationDto } from '../dtos/communication.dto';
import { JwtAuthGuard } from '../../../identity/api/guards/jwt-auth.guard';

@ApiTags('Application Management - Recruiter')
@ApiBearerAuth()
@Controller('/v1/recruiters/applications')
@UseGuards(JwtAuthGuard)
export class ApplicationRecruiterController {
  constructor(
    private readonly applicationService: ApplicationService,
    private readonly applicationStatusService: ApplicationStatusService,
    private readonly interviewService: InterviewService,
    private readonly offerService: OfferService,
    private readonly communicationService: CommunicationService,
  ) {}

  // Application Management
  @Get(':id')
  @ApiOperation({ summary: 'Get full application detail' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({
    status: 200,
    description: 'Application detail retrieved successfully',
    type: ApplicationDetailResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async getApplicationDetail(
    @Param('id') id: string,
  ): Promise<ApplicationDetailResponseDto | null> {
    return this.applicationService.getApplicationDetailById(id);
  }

  @Put(':id/notes')
  @ApiOperation({ summary: 'Update application notes' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Notes updated successfully' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async updateApplicationNotes(
    @Param('id') id: string,
    @Body() updateDto: UpdateApplicationNotesDto,
  ): Promise<any> {
    return this.applicationService.updateApplicationNotes(
      id,
      updateDto.notes,
      updateDto.updatedBy,
    );
  }

  @Post(':id/flag')
  @ApiOperation({ summary: 'Flag application' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Application flagged successfully' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async flagApplication(
    @Param('id') id: string,
    @Body() flagDto: FlagApplicationDto,
  ): Promise<any> {
    return this.applicationService.flagApplication(
      id,
      flagDto.reason,
      flagDto.flaggedBy,
    );
  }

  @Delete(':id/flag')
  @ApiOperation({ summary: 'Unflag application' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({
    status: 200,
    description: 'Application unflagged successfully',
  })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async unflagApplication(@Param('id') id: string): Promise<any> {
    return this.applicationService.unflagApplication(id);
  }

  @Put(':id/tags')
  @ApiOperation({ summary: 'Update application tags' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Tags updated successfully' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async updateApplicationTags(
    @Param('id') id: string,
    @Body() updateDto: UpdateApplicationTagsDto,
  ): Promise<any> {
    return this.applicationService.addTags(id, updateDto.tags);
  }

  @Put(':id/snapshot')
  @ApiOperation({ summary: 'Refresh candidate snapshot' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Snapshot refreshed successfully' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async refreshCandidateSnapshot(@Param('id') id: string): Promise<any> {
    return this.applicationService.updateCandidateSnapshot(id);
  }

  // Status Management (Pipeline-based)
  @Post(':id/stage/change')
  @ApiOperation({ summary: 'Change application stage via pipeline' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Stage changed successfully' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  @ApiResponse({ status: 400, description: 'Invalid stage transition' })
  async changeApplicationStage(
    @Param('id') id: string,
    @Body() changeDto: ChangeApplicationStageDto,
  ): Promise<any> {
    return this.applicationStatusService.changeApplicationStage(id, changeDto);
  }

  @Get(':id/available-stages')
  @ApiOperation({ summary: 'Get available next stages' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({
    status: 200,
    description: 'Available stages retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async getAvailableNextStages(@Param('id') id: string): Promise<any[]> {
    return this.applicationStatusService.getAvailableNextStages(id);
  }

  // Interview Management
  @Post(':id/interviews')
  @ApiOperation({ summary: 'Schedule interview' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 201, description: 'Interview scheduled successfully' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async scheduleInterview(
    @Param('id') id: string,
    @Body() createDto: CreateInterviewDto,
  ): Promise<any> {
    return this.interviewService.scheduleInterview(id, createDto);
  }

  @Get(':id/interviews')
  @ApiOperation({ summary: 'Get application interviews' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({
    status: 200,
    description: 'Interviews retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async getApplicationInterviews(@Param('id') id: string): Promise<any[]> {
    return this.interviewService.getInterviewsByApplication(id);
  }

  @Get('interviews/:interviewId')
  @ApiOperation({ summary: 'Get interview detail' })
  @ApiParam({ name: 'interviewId', description: 'Interview ID' })
  @ApiResponse({ status: 200, description: 'Interview retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Interview not found' })
  async getInterviewDetail(
    @Param('interviewId') interviewId: string,
  ): Promise<any> {
    return this.interviewService.getInterviewById(interviewId);
  }

  @Put('interviews/:interviewId')
  @ApiOperation({ summary: 'Update interview' })
  @ApiParam({ name: 'interviewId', description: 'Interview ID' })
  @ApiResponse({ status: 200, description: 'Interview updated successfully' })
  @ApiResponse({ status: 404, description: 'Interview not found' })
  async updateInterview(
    @Param('interviewId') interviewId: string,
    @Body() updateDto: UpdateInterviewDto,
  ): Promise<any> {
    return this.interviewService.updateInterview(interviewId, updateDto);
  }

  @Post('interviews/:interviewId/feedback')
  @ApiOperation({ summary: 'Submit interview feedback' })
  @ApiParam({ name: 'interviewId', description: 'Interview ID' })
  @ApiResponse({ status: 200, description: 'Feedback submitted successfully' })
  @ApiResponse({ status: 404, description: 'Interview not found' })
  async submitInterviewFeedback(
    @Param('interviewId') interviewId: string,
    @Body() feedbackDto: SubmitInterviewFeedbackDto,
  ): Promise<any> {
    return this.interviewService.submitFeedback(interviewId, feedbackDto);
  }

  @Post('interviews/:interviewId/cancel')
  @ApiOperation({ summary: 'Cancel interview' })
  @ApiParam({ name: 'interviewId', description: 'Interview ID' })
  @ApiResponse({ status: 200, description: 'Interview cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Interview not found' })
  async cancelInterview(
    @Param('interviewId') interviewId: string,
    @Body() body: { reason: string },
  ): Promise<any> {
    return this.interviewService.cancelInterview(interviewId, body.reason);
  }

  @Post('interviews/:interviewId/reschedule')
  @ApiOperation({ summary: 'Reschedule interview' })
  @ApiParam({ name: 'interviewId', description: 'Interview ID' })
  @ApiResponse({
    status: 200,
    description: 'Interview rescheduled successfully',
  })
  @ApiResponse({ status: 404, description: 'Interview not found' })
  async rescheduleInterview(
    @Param('interviewId') interviewId: string,
    @Body() rescheduleDto: RescheduleInterviewDto,
  ): Promise<any> {
    return this.interviewService.rescheduleInterview(
      interviewId,
      rescheduleDto,
    );
  }

  // Offer Management
  @Post(':id/offers')
  @ApiOperation({ summary: 'Create offer' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 201, description: 'Offer created successfully' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async createOffer(
    @Param('id') id: string,
    @Body() createDto: CreateOfferDto,
  ): Promise<any> {
    return this.offerService.createOffer(id, createDto);
  }

  @Get(':id/offers')
  @ApiOperation({ summary: 'Get application offers' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Offers retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async getApplicationOffers(@Param('id') id: string): Promise<any[]> {
    return this.offerService.getOffersByApplication(id);
  }

  @Get('offers/:offerId')
  @ApiOperation({ summary: 'Get offer detail' })
  @ApiParam({ name: 'offerId', description: 'Offer ID' })
  @ApiResponse({ status: 200, description: 'Offer retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Offer not found' })
  async getOfferDetail(@Param('offerId') offerId: string): Promise<any> {
    return this.offerService.getOfferById(offerId);
  }

  @Put('offers/:offerId')
  @ApiOperation({ summary: 'Update offer' })
  @ApiParam({ name: 'offerId', description: 'Offer ID' })
  @ApiResponse({ status: 200, description: 'Offer updated successfully' })
  @ApiResponse({ status: 404, description: 'Offer not found' })
  async updateOffer(
    @Param('offerId') offerId: string,
    @Body() updateDto: UpdateOfferDto,
  ): Promise<any> {
    return this.offerService.updateOffer(offerId, updateDto);
  }

  @Post('offers/:offerId/response')
  @ApiOperation({ summary: 'Record candidate response' })
  @ApiParam({ name: 'offerId', description: 'Offer ID' })
  @ApiResponse({ status: 200, description: 'Response recorded successfully' })
  @ApiResponse({ status: 404, description: 'Offer not found' })
  async recordOfferResponse(
    @Param('offerId') offerId: string,
    @Body() responseDto: RecordOfferResponseDto,
  ): Promise<any> {
    return this.offerService.recordCandidateResponse(offerId, responseDto);
  }

  @Post('offers/:offerId/cancel')
  @ApiOperation({ summary: 'Cancel offer' })
  @ApiParam({ name: 'offerId', description: 'Offer ID' })
  @ApiResponse({ status: 200, description: 'Offer cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Offer not found' })
  async cancelOffer(
    @Param('offerId') offerId: string,
    @Body() body: { reason: string },
  ): Promise<any> {
    return this.offerService.cancelOffer(offerId, body.reason);
  }

  // Communication Management
  @Post(':id/communications')
  @ApiOperation({ summary: 'Log communication' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({
    status: 201,
    description: 'Communication logged successfully',
  })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async logCommunication(
    @Param('id') id: string,
    @Body() logDto: LogCommunicationDto,
  ): Promise<any> {
    return this.communicationService.logCommunication(id, logDto);
  }

  @Get(':id/communications')
  @ApiOperation({ summary: 'Get communication log' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({
    status: 200,
    description: 'Communication log retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async getCommunicationLog(@Param('id') id: string): Promise<any[]> {
    return this.communicationService.getCommunicationLog(id);
  }
}
