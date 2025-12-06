import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/identity/api/guards/jwt-auth.guard';
import { RolesGuard } from 'src/modules/identity/api/guards/roles.guard';
import * as decorators from 'src/modules/identity/api/decorators';
import { BackofficeStatsService } from '../services/backoffice-stats.service';
import { RecruiterManagementService } from '../services/recruiter-management.service';
import { OrganizationManagementService } from '../services/organization-management.service';
import { JobManagementService } from '../services/job-management.service';
import { CandidateManagementService } from '../services/candidate-management.service';
import { BackofficeStatsQueryDto } from '../dtos/backoffice-stats.dto';
import {
  RecruiterListQueryDto,
  UpdateRecruiterDto,
  AssignRecruiterToOrganizationDto,
} from '../dtos/recruiter-management.dto';
import {
  OrganizationListQueryDto,
  UpdateOrganizationStatusDto,
} from '../dtos/organization-management.dto';
import {
  JobListQueryDto,
  UpdateJobStatusDto,
} from '../dtos/job-management.dto';
import {
  CandidateListQueryDto,
  UpdateCandidateStatusDto,
} from '../dtos/candidate-management.dto';
import { CurrentUser } from 'src/modules/identity/api/decorators';
import { UserDetailsService } from '../services/user-details.service';
import { UserManagementService } from '../services/user-management.service';
import {
  UpdateUserDto,
  UpdateUserStatusDto,
  UserListQueryDto,
} from '../dtos/user-management.dto';

@ApiTags('BackOffice Admin')
@Controller('v1/back-office')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@decorators.Roles('super_admin', 'admin')
export class BackofficeController {
  constructor(
    private readonly statsService: BackofficeStatsService,
    private readonly recruiterService: RecruiterManagementService,
    private readonly organizationService: OrganizationManagementService,
    private readonly jobService: JobManagementService,
    private readonly candidateService: CandidateManagementService,
    private readonly userDetailsService: UserDetailsService,
    private readonly userManagementService: UserManagementService,
  ) {}

  // ========== STATISTICS ==========
  @Get('stats')
  @ApiOperation({ summary: 'Get backoffice statistics and dashboard data' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getStats(@Query() query: BackofficeStatsQueryDto) {
    return this.statsService.getBackofficeStats(query);
  }

  // ========== USER MANAGEMENT ==========
  @Get('users')
  @ApiOperation({ summary: 'Get all users with filtering' })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
  })
  async getUsers(@Query() query: UserListQueryDto) {
    return this.userManagementService.getUsers(query);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string) {
    return this.userManagementService.getUserById(id);
  }

  @Put('users/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Param('id') id: string,
    @Body() updateDto: UpdateUserDto,
    @CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.userManagementService.updateUser(id, updateDto, user.sub);
  }

  @Put('users/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user status' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User status updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateUserStatusDto,
    @CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.userManagementService.updateUserStatus(id, updateDto, user.sub);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete user (soft delete - sets status to inactive)',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    await this.userManagementService.deleteUser(id, user.sub);
  }

  // ========== RECRUITER MANAGEMENT ==========
  @Get('recruiters')
  @ApiOperation({ summary: 'Get all recruiters with filtering' })
  @ApiResponse({
    status: 200,
    description: 'Recruiters retrieved successfully',
  })
  async getRecruiters(@Query() query: RecruiterListQueryDto) {
    return this.recruiterService.getRecruiters(query);
  }

  @Get('recruiters/:id')
  @ApiOperation({ summary: 'Get recruiter by ID' })
  @ApiParam({ name: 'id', description: 'Recruiter membership ID' })
  @ApiResponse({ status: 200, description: 'Recruiter retrieved successfully' })
  async getRecruiterById(@Param('id') id: string) {
    return this.recruiterService.getRecruiterById(id);
  }

  @Put('recruiters/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update recruiter status or role' })
  @ApiParam({ name: 'id', description: 'Recruiter membership ID' })
  @ApiResponse({ status: 200, description: 'Recruiter updated successfully' })
  async updateRecruiter(
    @Param('id') id: string,
    @Body() updateDto: UpdateRecruiterDto,
    @CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.recruiterService.updateRecruiter(id, updateDto, user.sub);
  }

  @Post('recruiters/:userId/assign')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign recruiter to organization' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 201, description: 'Recruiter assigned successfully' })
  async assignRecruiter(
    @Param('userId') userId: string,
    @Body() assignDto: AssignRecruiterToOrganizationDto,
    @CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.recruiterService.assignRecruiterToOrganization(
      userId,
      assignDto,
      user.sub,
    );
  }

  // ========== ORGANIZATION MANAGEMENT ==========
  @Get('organizations')
  @ApiOperation({ summary: 'Get all organizations with filtering' })
  @ApiResponse({
    status: 200,
    description: 'Organizations retrieved successfully',
  })
  async getOrganizations(@Query() query: OrganizationListQueryDto) {
    return this.organizationService.getOrganizations(query);
  }

  @Get('organizations/:id')
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization retrieved successfully',
  })
  async getOrganizationById(@Param('id') id: string) {
    return this.organizationService.getOrganizationById(id);
  }

  @Put('organizations/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update organization verification/active status' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization status updated successfully',
  })
  async updateOrganizationStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateOrganizationStatusDto,
  ) {
    return this.organizationService.updateOrganizationStatus(id, updateDto);
  }

  // ========== JOB MANAGEMENT ==========
  @Get('jobs')
  @ApiOperation({ summary: 'Get all job postings with filtering' })
  @ApiResponse({ status: 200, description: 'Jobs retrieved successfully' })
  async getJobs(@Query() query: JobListQueryDto) {
    return this.jobService.getJobs(query);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get job by ID' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Job retrieved successfully' })
  async getJobById(@Param('id') id: string) {
    return this.jobService.getJobById(id);
  }

  @Put('jobs/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update job status' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Job status updated successfully' })
  async updateJobStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateJobStatusDto,
    @CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.jobService.updateJobStatus(id, updateDto, user.sub);
  }

  @Delete('jobs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete job posting' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ status: 204, description: 'Job deleted successfully' })
  async deleteJob(@Param('id') id: string) {
    return this.jobService.deleteJob(id);
  }

  // ========== CANDIDATE MANAGEMENT ==========
  @Get('candidates')
  @ApiOperation({ summary: 'Get all candidates with filtering' })
  @ApiResponse({
    status: 200,
    description: 'Candidates retrieved successfully',
  })
  async getCandidates(@Query() query: CandidateListQueryDto) {
    return this.candidateService.getCandidates(query);
  }

  @Get('candidates/:id')
  @ApiOperation({ summary: 'Get candidate profile by ID' })
  @ApiParam({ name: 'id', description: 'Candidate profile ID' })
  @ApiResponse({ status: 200, description: 'Candidate retrieved successfully' })
  async getCandidateById(@Param('id') id: string) {
    return this.candidateService.getCandidateById(id);
  }

  @Put('candidates/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update candidate profile status' })
  @ApiParam({ name: 'id', description: 'Candidate profile ID' })
  @ApiResponse({
    status: 200,
    description: 'Candidate status updated successfully',
  })
  async updateCandidateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateCandidateStatusDto,
  ) {
    return this.candidateService.updateCandidateStatus(id, updateDto);
  }

  @Get('users/:userId/details')
  @ApiOperation({
    summary: 'Get comprehensive user details with all relations',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserDetails(@Param('userId') userId: string) {
    return await this.userDetailsService.getUserDetails(userId);
  }
}
