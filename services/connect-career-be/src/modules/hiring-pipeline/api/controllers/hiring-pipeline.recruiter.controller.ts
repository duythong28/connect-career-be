import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { HiringPipelineRecruiterService } from '../services/hiring-pipeline.service';
import {
  CreatePipelineDto,
  UpdatePipelineDto,
  CreateStageDto,
  UpdateStageDto,
  ReorderStagesDto,
  CreateTransitionDto,
  UpdateTransitionDto,
  PipelineValidationResultDto,
  AssignJobToPipelineDto,
  RemoveJobFromPipelineDto,
} from '../dtos/hiring-pipeline.dto';
import { HiringPipeline } from '../../domain/entities/hiring-pipeline.entity';
import { PipelineStage } from '../../domain/entities/pipeline-stage.entity';
import { PipelineTransition } from '../../domain/entities/pipeline-transition.entity';
import { Job } from 'src/modules/jobs/domain/entities/job.entity';

@ApiTags('Hiring Pipeline - Recruiter')
@ApiBearerAuth()
@Controller('/v1/recruiters/hiring-pipeline')
export class HiringPipelineRecruiterController {
  constructor(
    private readonly hiringPipelineRecruiterService: HiringPipelineRecruiterService,
  ) {}

  // Pipeline Endpoints
  @Post()
  @ApiOperation({ summary: 'Create a new hiring pipeline' })
  @ApiResponse({
    status: 201,
    description: 'Pipeline created successfully',
    type: HiringPipeline,
  })
  @ApiResponse({
    status: 409,
    description: 'Pipeline with this name already exists',
  })
  async createPipeline(
    @Body() createPipelineDto: CreatePipelineDto,
  ): Promise<HiringPipeline | null> {
    return this.hiringPipelineRecruiterService.createPipeline(
      createPipelineDto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all hiring pipelines for organization' })
  @ApiQuery({ name: 'organizationId', required: true, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Pipelines retrieved successfully' })
  async findAllPipelines(
    @Query('organizationId') organizationId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.hiringPipelineRecruiterService.findAllPipelines(
      organizationId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
  }
  
  @Get('active')
  @ApiOperation({ summary: 'Get all active hiring pipelines for organization' })
  @ApiQuery({ name: 'organizationId', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'Active pipelines retrieved successfully',
  })
  async findActivePipelines(
    @Query('organizationId') organizationId: string,
  ): Promise<HiringPipeline[]> {
    return this.hiringPipelineRecruiterService.findActivePipelines(organizationId);
  }  

  @Get(':id')
  @ApiOperation({ summary: 'Get hiring pipeline by ID' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiResponse({
    status: 200,
    description: 'Pipeline retrieved successfully',
    type: HiringPipeline,
  })
  @ApiResponse({ status: 404, description: 'Pipeline not found' })
  async findPipelineById(@Param('id') id: string): Promise<HiringPipeline> {
    return this.hiringPipelineRecruiterService.findPipelineById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update hiring pipeline' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiResponse({
    status: 200,
    description: 'Pipeline updated successfully',
    type: HiringPipeline,
  })
  @ApiResponse({ status: 404, description: 'Pipeline not found' })
  @ApiResponse({
    status: 409,
    description: 'Pipeline with this name already exists',
  })
  async updatePipeline(
    @Param('id') id: string,
    @Body() updatePipelineDto: UpdatePipelineDto,
  ): Promise<HiringPipeline | null> {
    return this.hiringPipelineRecruiterService.updatePipeline(
      id,
      updatePipelineDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete hiring pipeline' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiResponse({ status: 204, description: 'Pipeline deleted successfully' })
  @ApiResponse({ status: 404, description: 'Pipeline not found' })
  async deletePipeline(@Param('id') id: string): Promise<void> {
    return this.hiringPipelineRecruiterService.deletePipeline(id);
  }

  @Get(':id/validate')
  @ApiOperation({ summary: 'Validate hiring pipeline configuration' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiResponse({
    status: 200,
    description: 'Validation result',
    type: PipelineValidationResultDto,
  })
  @ApiResponse({ status: 404, description: 'Pipeline not found' })
  async validatePipeline(
    @Param('id') id: string,
  ): Promise<PipelineValidationResultDto> {
    return this.hiringPipelineRecruiterService.validatePipeline(id);
  }

  // Stage Endpoints
  @Post(':pipelineId/stages')
  @ApiOperation({ summary: 'Create a new stage in pipeline' })
  @ApiParam({ name: 'pipelineId', description: 'Pipeline ID' })
  @ApiResponse({
    status: 201,
    description: 'Stage created successfully',
    type: PipelineStage,
  })
  @ApiResponse({ status: 404, description: 'Pipeline not found' })
  @ApiResponse({
    status: 409,
    description: 'Stage with this key already exists',
  })
  async createStage(
    @Param('pipelineId') pipelineId: string,
    @Body() createStageDto: CreateStageDto,
  ): Promise<PipelineStage> {
    return this.hiringPipelineRecruiterService.createStage(
      pipelineId,
      createStageDto,
    );
  }

  @Get(':pipelineId/stages')
  @ApiOperation({ summary: 'Get all stages in pipeline' })
  @ApiParam({ name: 'pipelineId', description: 'Pipeline ID' })
  @ApiResponse({
    status: 200,
    description: 'Stages retrieved successfully',
    type: [PipelineStage],
  })
  @ApiResponse({ status: 404, description: 'Pipeline not found' })
  async findStagesByPipelineId(
    @Param('pipelineId') pipelineId: string,
  ): Promise<PipelineStage[]> {
    return this.hiringPipelineRecruiterService.findStagesByPipelineId(
      pipelineId,
    );
  }

  @Get('stages/:id')
  @ApiOperation({ summary: 'Get stage by ID' })
  @ApiParam({ name: 'id', description: 'Stage ID' })
  @ApiResponse({
    status: 200,
    description: 'Stage retrieved successfully',
    type: PipelineStage,
  })
  @ApiResponse({ status: 404, description: 'Stage not found' })
  async findStageById(@Param('id') id: string): Promise<PipelineStage> {
    return this.hiringPipelineRecruiterService.findStageById(id);
  }

  @Put('stages/:id')
  @ApiOperation({ summary: 'Update stage' })
  @ApiParam({ name: 'id', description: 'Stage ID' })
  @ApiResponse({
    status: 200,
    description: 'Stage updated successfully',
    type: PipelineStage,
  })
  @ApiResponse({ status: 404, description: 'Stage not found' })
  @ApiResponse({
    status: 409,
    description: 'Stage with this key already exists',
  })
  async updateStage(
    @Param('id') id: string,
    @Body() updateStageDto: UpdateStageDto,
  ): Promise<PipelineStage | null> {
    return this.hiringPipelineRecruiterService.updateStage(id, updateStageDto);
  }

  @Delete('stages/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete stage' })
  @ApiParam({ name: 'id', description: 'Stage ID' })
  @ApiResponse({ status: 204, description: 'Stage deleted successfully' })
  @ApiResponse({ status: 404, description: 'Stage not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete stage referenced in transitions',
  })
  async deleteStage(@Param('id') id: string): Promise<void> {
    return this.hiringPipelineRecruiterService.deleteStage(id);
  }

  @Put(':pipelineId/stages/reorder')
  @ApiOperation({ summary: 'Reorder stages in pipeline' })
  @ApiParam({ name: 'pipelineId', description: 'Pipeline ID' })
  @ApiResponse({ status: 200, description: 'Stages reordered successfully' })
  @ApiResponse({ status: 404, description: 'Pipeline not found' })
  @ApiResponse({ status: 400, description: 'Invalid stage IDs provided' })
  async reorderStages(
    @Param('pipelineId') pipelineId: string,
    @Body() reorderStagesDto: ReorderStagesDto,
  ): Promise<void> {
    return this.hiringPipelineRecruiterService.reorderStages(
      pipelineId,
      reorderStagesDto,
    );
  }

  @Post(':pipelineId/transitions')
  @ApiOperation({ summary: 'Create a new transition in pipeline' })
  @ApiParam({ name: 'pipelineId', description: 'Pipeline ID' })
  @ApiResponse({
    status: 201,
    description: 'Transition created successfully',
    type: PipelineTransition,
  })
  @ApiResponse({ status: 404, description: 'Pipeline not found' })
  @ApiResponse({ status: 400, description: 'Invalid stage keys' })
  @ApiResponse({ status: 409, description: 'Transition already exists' })
  async createTransition(
    @Param('pipelineId') pipelineId: string,
    @Body() createTransitionDto: CreateTransitionDto,
  ): Promise<PipelineTransition> {
    return this.hiringPipelineRecruiterService.createTransition(
      pipelineId,
      createTransitionDto,
    );
  }

  @Get(':pipelineId/transitions')
  @ApiOperation({ summary: 'Get all transitions in pipeline' })
  @ApiParam({ name: 'pipelineId', description: 'Pipeline ID' })
  @ApiResponse({
    status: 200,
    description: 'Transitions retrieved successfully',
    type: [PipelineTransition],
  })
  @ApiResponse({ status: 404, description: 'Pipeline not found' })
  async findTransitionsByPipelineId(
    @Param('pipelineId') pipelineId: string,
  ): Promise<PipelineTransition[]> {
    return this.hiringPipelineRecruiterService.findTransitionsByPipelineId(
      pipelineId,
    );
  }

  @Get('transitions/:id')
  @ApiOperation({ summary: 'Get transition by ID' })
  @ApiParam({ name: 'id', description: 'Transition ID' })
  @ApiResponse({
    status: 200,
    description: 'Transition retrieved successfully',
    type: PipelineTransition,
  })
  @ApiResponse({ status: 404, description: 'Transition not found' })
  async findTransitionById(
    @Param('id') id: string,
  ): Promise<PipelineTransition> {
    return this.hiringPipelineRecruiterService.findTransitionById(id);
  }

  @Put('transitions/:id')
  @ApiOperation({ summary: 'Update transition' })
  @ApiParam({ name: 'id', description: 'Transition ID' })
  @ApiResponse({
    status: 200,
    description: 'Transition updated successfully',
    type: PipelineTransition,
  })
  @ApiResponse({ status: 404, description: 'Transition not found' })
  @ApiResponse({ status: 400, description: 'Invalid stage keys' })
  @ApiResponse({ status: 409, description: 'Transition already exists' })
  async updateTransition(
    @Param('id') id: string,
    @Body() updateTransitionDto: UpdateTransitionDto,
  ): Promise<PipelineTransition | null> {
    return this.hiringPipelineRecruiterService.updateTransition(
      id,
      updateTransitionDto,
    );
  }

  @Delete('transitions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete transition' })
  @ApiParam({ name: 'id', description: 'Transition ID' })
  @ApiResponse({ status: 204, description: 'Transition deleted successfully' })
  @ApiResponse({ status: 404, description: 'Transition not found' })
  async deleteTransition(@Param('id') id: string): Promise<void> {
    return this.hiringPipelineRecruiterService.deleteTransition(id);
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Get hiring pipeline for a specific job' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiResponse({
    status: 200,
    description: 'Pipeline retrieved successfully',
    type: HiringPipeline,
  })
  @ApiResponse({ status: 404, description: 'Pipeline not found for this job' })
  async getPipelineByJobId(@Param('jobId') jobId: string): Promise<HiringPipeline | null> {
    return this.hiringPipelineRecruiterService.findPipelineByJobId(jobId);
  }

  @Get(':id/jobs')
  @ApiOperation({ summary: 'Get all jobs assigned to a pipeline' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiResponse({
    status: 200,
    description: 'Jobs retrieved successfully',
    type: [Job],
  })
  async getJobsForPipeline(@Param('id') id: string): Promise<Job[]> {
    return this.hiringPipelineRecruiterService.getJobsForPipeline(id);
  }

  @Post(':id/jobs/assign')
  @ApiOperation({ summary: 'Assign job to hiring pipeline' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiResponse({
    status: 200,
    description: 'Job assigned successfully',
    type: HiringPipeline,
  })
  async assignJobToPipeline(
    @Param('id') id: string,
    @Body() assignDto: AssignJobToPipelineDto,
  ): Promise<HiringPipeline> {
    return this.hiringPipelineRecruiterService.assignJobToPipeline(id, assignDto);
  }

  @Post(':id/jobs/remove')
  @ApiOperation({ summary: 'Remove job from hiring pipeline' })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiResponse({
    status: 200,
    description: 'Job removed successfully',
    type: HiringPipeline,
  })
  async removeJobFromPipeline(
    @Param('id') id: string,
    @Body() removeDto: RemoveJobFromPipelineDto,
  ): Promise<HiringPipeline> {
    return this.hiringPipelineRecruiterService.removeJobFromPipeline(id, removeDto.jobId);
  }

}
