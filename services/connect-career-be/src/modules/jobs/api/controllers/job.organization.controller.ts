import {
    Controller,
    Post,
    Get,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
  } from '@nestjs/common';
  import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
  } from '@nestjs/swagger';
  import { JobService } from '../services/job.service';
  import { CreateJobDto } from '../dtos/create-job.dto';
  import { JwtAuthGuard } from 'src/modules/identity/api/guards/jwt-auth.guard';
  import * as decorators from 'src/modules/identity/api/decorators';
  import { PaginationDto } from 'src/shared/kernel';
  import { Job, JobStatus } from '../../domain/entities/job.entity';
  
  @ApiTags('Organization Jobs')
  @Controller('/v1/recruiters/jobs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  export class JobOrganizationController {
    constructor(private readonly jobService: JobService) {}
  
    @Post()
    @ApiOperation({ summary: 'Create a new job posting' })
    @ApiResponse({
      status: 201,
      description: 'Job created successfully',
      type: Job,
    })
    @ApiResponse({
      status: 400,
      description: 'Invalid job data',
    })
    @ApiResponse({
      status: 401,
      description: 'Unauthorized',
    })
    async createJob(
      @decorators.CurrentUser() user: decorators.CurrentUserPayload,
      @Body() createJobDto: CreateJobDto,
    ): Promise<Job> {
      return this.jobService.createJob(
        user.sub,
        createJobDto,
      );
    }
  
    @Get()
    @ApiOperation({ summary: 'Get jobs posted by the organization' })
    @ApiResponse({
      status: 200,
      description: 'Jobs retrieved successfully',
      type: [Job],
    })
    async getOrganizationJobs(
      @decorators.CurrentUser() user: decorators.CurrentUserPayload,
      @Query() paginationDto: PaginationDto,
    ) {
      return this.jobService.getJobsByRecruiter(
        user.sub,
        paginationDto,
      );
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Get job by ID' })
    @ApiParam({ name: 'id', description: 'Job ID' })
    @ApiResponse({
      status: 200,
      description: 'Job retrieved successfully',
      type: Job,
    })
    @ApiResponse({
      status: 404,
      description: 'Job not found',
    })
    async getJobById(
      @Param('id', ParseUUIDPipe) id: string,
    ): Promise<Job> {
      return this.jobService.getJobById(id);
    }
  
    @Put(':id')
    @ApiOperation({ summary: 'Update job posting' })
    @ApiParam({ name: 'id', description: 'Job ID' })
    @ApiResponse({
      status: 200,
      description: 'Job updated successfully',
      type: Job,
    })
    @ApiResponse({
      status: 404,
      description: 'Job not found',
    })
    async updateJob(
      @Param('id', ParseUUIDPipe) id: string,
      @decorators.CurrentUser() user: decorators.CurrentUserPayload,
      @Body() updateJobDto: Partial<CreateJobDto>,
    ): Promise<Job> {
      return this.jobService.updateJob(id, user.sub, updateJobDto);
    }
  
    @Delete(':id')
    @ApiOperation({ summary: 'Delete job posting' })
    @ApiParam({ name: 'id', description: 'Job ID' })
    @ApiResponse({
      status: 200,
      description: 'Job deleted successfully',
    })
    @ApiResponse({
      status: 404,
      description: 'Job not found',
    })
    async deleteJob(
      @Param('id', ParseUUIDPipe) id: string,
      @decorators.CurrentUser() user: decorators.CurrentUserPayload,
    ): Promise<{ message: string }> {
      await this.jobService.deleteJob(id, user.sub);
      return { message: 'Job deleted successfully' };
    }
  
    @Put(':id/status')
    @ApiOperation({ summary: 'Update job status' })
    @ApiParam({ name: 'id', description: 'Job ID' })
    @ApiResponse({
      status: 200,
      description: 'Job status updated successfully',
      type: Job,
    })
    async updateJobStatus(
      @Param('id', ParseUUIDPipe) id: string,
      @decorators.CurrentUser() user: decorators.CurrentUserPayload,
      @Body() body: { status: JobStatus },
    ): Promise<Job> {
      return this.jobService.updateJobStatus(id, user.sub, body.status);
    }
  }