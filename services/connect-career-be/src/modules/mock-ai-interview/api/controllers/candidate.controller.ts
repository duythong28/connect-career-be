import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/identity/api/guards/jwt-auth.guard';
import { MockInterviewService } from '../services/mock-interview.service';
import * as decorators from 'src/modules/identity/api/decorators';
import { GenerateMockInterviewQuestionsDto } from '../dto/generate-mock-interview-question.dto';
import { CreateMockInterviewDto } from '../dto/mock-interview.dto';

@Controller('v1/candidates/mock-ai-interview')
@UseGuards(JwtAuthGuard)
export class CandidateMockAIInterviewController {
  constructor(private readonly mockAIInterviewService: MockInterviewService) {}
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
}
