import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CandidateProfileService } from '../services/candidate.profile.service';
import { JwtAuthGuard } from 'src/modules/identity/api/guards/jwt-auth.guard';
import * as decorators from 'src/modules/identity/api/decorators';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  CreateCandidateProfileDto,
  UpdateCandidateProfileDto,
} from '../dtos/candidate-profile.dto';
import { CandidateInterviewsQueryDto, CandidateOffersQueryDto } from '../dtos/candidate-query.dto';

@Controller('/v1/candidates/profiles')
@UseGuards(JwtAuthGuard)
export class CandidateProfileController {
  constructor(
    private readonly candidateProfileService: CandidateProfileService,
  ) {}

  @Get('/me')
  async getMyCandidateProfile(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.candidateProfileService.getCandidateProfileByUserId(user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Create candidate profile' })
  @ApiResponse({ status: 201, description: 'Profile created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Profile already exists or validation error',
  })
  async createCandidateProfile(
    @Body() dto: CreateCandidateProfileDto,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    // Ensure userId matches authenticated user
    dto.userId = user.sub;
    return this.candidateProfileService.createCandidateProfile(dto);
  }

  @Put('/me')
  @ApiOperation({
    summary: 'Update my entire candidate profile (replaces all data)',
  })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async updateMyCandidateProfile(
    @Body() dto: UpdateCandidateProfileDto,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.candidateProfileService.updateCandidateProfile(user.sub, dto);
  }

  @Patch('/me')
  @ApiOperation({ summary: 'Partially update my candidate profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async patchMyCandidateProfile(
    @Body() dto: UpdateCandidateProfileDto,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.candidateProfileService.updateCandidateProfile(user.sub, dto);
  }
  @Get(':id')
  async getCandidateProfileById(@Param('id', ParseUUIDPipe) id: string) {
    return this.candidateProfileService.getCandidateProfileById(id);
  }

  @Get('/me/interviews')
  @ApiOperation({ summary: 'Get all interviews for the current candidate' })
  @ApiResponse({ status: 200, description: 'Interviews retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Candidate profile not found' })
  async getMyInterviews(
    @Query() query: CandidateInterviewsQueryDto,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.candidateProfileService.getInterviewsByCandidateId(user.sub, {
      status: query.status,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      applicationId: query.applicationId,
      jobId: query.jobId,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get('/me/offers')
  @ApiOperation({ summary: 'Get all offers for the current candidate' })
  @ApiResponse({ status: 200, description: 'Offers retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Candidate profile not found' })
  async getMyOffers(
    @Query() query: CandidateOffersQueryDto,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.candidateProfileService.getOffersByCandidateId(user.sub, {
      status: query.status,
      applicationId: query.applicationId,
      jobId: query.jobId,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':id/interviews')
  @ApiOperation({ summary: 'Get all interviews for a candidate by ID' })
  @ApiResponse({ status: 200, description: 'Interviews retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Candidate profile not found' })
  async getCandidateInterviews(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: CandidateInterviewsQueryDto,
  ) {
    return this.candidateProfileService.getInterviewsByCandidateId(id, {
      status: query.status,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      applicationId: query.applicationId,
      jobId: query.jobId,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':id/offers')
  @ApiOperation({ summary: 'Get all offers for a candidate by ID' })
  @ApiResponse({ status: 200, description: 'Offers retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Candidate profile not found' })
  async getCandidateOffers(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: CandidateOffersQueryDto,
  ) {
    return this.candidateProfileService.getOffersByCandidateId(id, {
      status: query.status,
      applicationId: query.applicationId,
      jobId: query.jobId,
      page: query.page,
      limit: query.limit,
    });
  }
}
