import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { MockInterviewService } from '../services/mock-interview.service';
import { AgentInterviewerService } from '../services/agent-interviewer.service';
import { JwtAuthGuard } from 'src/modules/identity/api/guards/jwt-auth.guard';

@Controller('v1/system/mock-ai-interview')
@UseGuards(JwtAuthGuard)
export class SystemMockAIInterviewController {
  constructor(
    private readonly mockAIInterviewService: MockInterviewService,
    private readonly agentInterviewerService: AgentInterviewerService,
  ) {}

  @Post('interviewers/default')
  async createDefaultInterviewer() {
    return this.agentInterviewerService.createDefaultInterviewer();
  }
}
