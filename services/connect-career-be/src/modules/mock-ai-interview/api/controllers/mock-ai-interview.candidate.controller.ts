import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/identity/api/guards/jwt-auth.guard';
import { MockInterviewService } from '../services/mock-interview.service';
import * as decorators from 'src/modules/identity/api/decorators';
import {
  GenerateMockInterviewQuestionsDto,
  GenerateSpecificAreasFromJobDescriptionDto,
} from '../dto/generate-mock-interview-question.dto';
import { CreateMockInterviewDto } from '../dto/mock-interview.dto';
import { AgentInterviewerService } from '../services/agent-interviewer.service';
import { ApiOperation } from '@nestjs/swagger';
import { ListMockInterviewQueryDto } from '../dto/list-mock-interview-query.dto';

@Controller('v1/candidates/mock-ai-interview')
@UseGuards(JwtAuthGuard)
export class CandidateMockAIInterviewController {
  constructor(
    private readonly mockAIInterviewService: MockInterviewService,
    private readonly agentInterviewerService: AgentInterviewerService,
  ) {}
  @Get()
  @ApiOperation({ summary: 'Get all AI mock interviews for the current candidate' })
 
  async getMyInterviews(
    @Query() query: ListMockInterviewQueryDto,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    const filters = {
      status: query.status,
      createdAfter: query.createdAfter ? new Date(query.createdAfter) : undefined,
      createdBefore: query.createdBefore ? new Date(query.createdBefore) : undefined,
      completedAfter: query.completedAfter ? new Date(query.completedAfter) : undefined,
      completedBefore: query.completedBefore ? new Date(query.completedBefore) : undefined,
      page: query.page || 1,
      limit: query.limit || 20,
    };

    const { sessions, total } = await this.mockAIInterviewService.getMySessions(
      user.sub,
      filters,
    );

    return {
      success: true,
      data: sessions,
      pagination: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }
  @Get('interviewers')
  async getAllInterviewers() {
    const interviewers =
      await this.agentInterviewerService.getAllInterviewers();
    return {
      success: true,
      data: interviewers,
    };
  }

  @Get('interviewers/:id')
  async getInterviewerById(@Param('id') id: string) {
    const interviewer =
      await this.agentInterviewerService.getInterviewerById(id);
    if (!interviewer) {
      throw new NotFoundException('Interviewer not found');
    }
    return {
      success: true,
      data: interviewer,
    };
  }

  @Post('questions/specific-areas')
  async generateSpecificAreasFromJobDescription(
    @Body() body: GenerateSpecificAreasFromJobDescriptionDto,
  ) {
    return this.mockAIInterviewService.generateSpecificAreasFromJobDescription(
      body,
    );
  }

  @Post('questions/generate')
  async generateQuestionsSession(
    @Body() body: GenerateMockInterviewQuestionsDto,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.mockAIInterviewService.generateMockInterviewQuestion(
      body,
      user.sub,
    );
  }

  @Post('')
  async createQuestionsSession(
    @Body() body: CreateMockInterviewDto,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.mockAIInterviewService.createMockInterview(body, user.sub);
  }

  @Get(':id')
  async getSession(@Param('id') id: string) {
    const session = await this.mockAIInterviewService.getSession(id);
    return {
      success: true,
      data: session,
    };
  }
}
