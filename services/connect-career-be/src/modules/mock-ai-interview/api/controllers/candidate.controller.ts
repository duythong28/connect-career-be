import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/identity/api/guards/jwt-auth.guard';
import { MockInterviewService } from '../services/mock-interview.service';
import { CreateMockInterviewDto } from '../dto/create-mock-interview.dto';
import * as decorators from 'src/modules/identity/api/decorators';

@Controller('v1/candidates/mock-ai-interview')
@UseGuards(JwtAuthGuard)
export class CandidateMockAIInterviewController {
  constructor(private readonly mockAIInterviewService: MockInterviewService) {}
  @Post('questions')
  async createSession(@Body() body: CreateMockInterviewDto, @decorators.CurrentUser() user: decorators.CurrentUserPayload) {
    return this.mockAIInterviewService.createSession(body, user.sub);
  }
}
