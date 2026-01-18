import {
  Controller,
  Param,
  ParseUUIDPipe,
  Put,
  Body,
  Post,
  HttpCode,
  HttpStatus,
  Query,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { HiringPipeline } from '../../domain/entities/hiring-pipeline.entity';
import { HiringPipelineRecruiterService } from '../services/hiring-pipeline.service';
import {
  UpdatePipelineComprehensiveDto,
  CreatePipelineComprehensiveDto,
  GeneratePipelineWithAIDto,
} from '../dtos/hiring-pipeline.dto';

@ApiTags('Hiring Pipeline V2 - Recruiter')
@ApiBearerAuth()
@Controller('v2/recruiters/hiring-pipeline')
export class HiringPipelineV2RecruiterController {
  constructor(
    private readonly hiringPipelineRecruiterService: HiringPipelineRecruiterService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create hiring pipeline with all stages and transitions',
  })
  @ApiResponse({
    status: 201,
    description: 'Pipeline created successfully with all components',
    type: HiringPipeline,
  })
  @ApiResponse({
    status: 409,
    description: 'Pipeline with this name already exists',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid stage keys or transition configuration',
  })
  @HttpCode(HttpStatus.CREATED)
  async createPipelineComprehensive(
    @Body() createPipelineDto: CreatePipelineComprehensiveDto,
  ): Promise<HiringPipeline | null> {
    return await this.hiringPipelineRecruiterService.createPipelineComprehensive(
      createPipelineDto,
    );
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update hiring pipeline with all stages and transitions',
  })
  @ApiParam({ name: 'id', description: 'Pipeline ID' })
  @ApiResponse({
    status: 200,
    description: 'Pipeline updated successfully with all components',
    type: HiringPipeline,
  })
  @ApiResponse({ status: 404, description: 'Pipeline not found' })
  @ApiResponse({
    status: 409,
    description: 'Pipeline with this name already exists',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid stage keys or transition configuration',
  })
  @HttpCode(HttpStatus.OK)
  async updatePipelineComprehensive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePipelineDto: UpdatePipelineComprehensiveDto,
  ): Promise<HiringPipeline | null> {
    return await this.hiringPipelineRecruiterService.updatePipelineComprehensive(
      id,
      updatePipelineDto,
    );
  }
  // Add this endpoint method inside the controller class (before or after createPipelineComprehensive)
  @Post('generate-with-ai')
  @ApiOperation({
    summary: 'Generate hiring pipeline data using AI',
    description:
      'Uses AI to generate a complete hiring pipeline structure with stages and transitions. Returns data in CreatePipelineComprehensiveDto format that can be directly used in POST /api/v2/recruiters/hiring-pipeline endpoint.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Pipeline data generated successfully - ready to be sent to POST endpoint',
    type: CreatePipelineComprehensiveDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or AI generation failed',
  })
  async generatePipelineWithAI(
    @Body() generateDto: GeneratePipelineWithAIDto,
    @Query('organizationId') organizationId: string,
  ): Promise<CreatePipelineComprehensiveDto> {
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    const allowedRoles = generateDto.allowedRoles || ['recruiter', 'admin'];

    return await this.hiringPipelineRecruiterService.generatePipelineDataWithAI(
      organizationId,
      generateDto.userInput,
      allowedRoles,
    );
  }
}
