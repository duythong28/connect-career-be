import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterviewQuestion } from './domain/entities/mock_interview_questions.entity';
import { InterviewResponse } from './domain/entities/mock_interview_responses.entity';
import { InterviewScore } from './domain/entities/mock_interview_scores.entity';
import { InterviewFeedback } from './domain/entities/mock_interview_feedback.entity';
import { SystemMockAIInterviewController } from './api/controllers/mock-ai-interview.back-office.controller';
import { CandidateMockAIInterviewController } from './api/controllers/mock-ai-interview.candidate.controller';
import { WebhookController } from './api/controllers/mock-ai-interview.webhook.controller';
import { MockInterviewCallController } from './api/controllers/mock-ai-interview.call.controller';
import { MockInterviewService } from './api/services/mock-interview.service';
import { AIModule } from 'src/shared/infrastructure/external-services/ai/ai.module';
import { AgentInterviewerService } from './api/services/agent-interviewer.service';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';
import { AIMockInterview } from './domain/entities/mock_interview_sessions.entity';
import { AgentInterviewer } from './domain/entities/agent_interviewer.entity';
import { User } from '../identity/domain/entities';
import { ResponseService } from './api/services/response.service';
import { AnalyticsService } from './api/services/analytics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AIMockInterview,
      InterviewQuestion,
      InterviewResponse,
      InterviewScore,
      InterviewFeedback,
      AgentInterviewer,
      User,
    ]),
    AIModule,
  ],
  controllers: [
    SystemMockAIInterviewController,
    CandidateMockAIInterviewController,
    WebhookController,
    MockInterviewCallController,
  ],
  providers: [
    MockInterviewService,
    AIService,
    AgentInterviewerService,
    ResponseService,
    AnalyticsService,
  ],
})
export class MockAIInterviewModule {}
