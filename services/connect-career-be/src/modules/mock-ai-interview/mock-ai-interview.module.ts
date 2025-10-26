import { Module } from '@nestjs/common';
import { MockInterviewSession } from './domain/entities/mock_interview_sessions.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterviewQuestion } from './domain/entities/mock_interview_questions.entity';
import { InterviewResponse } from './domain/entities/mock_interview_responses.entity';
import { InterviewScore } from './domain/entities/mock_interview_scores.entity';
import { InterviewFeedback } from './domain/entities/mock_interview_feedback.entity';
import { SystemMockAIInterviewController } from './api/controllers/system.controller';
import { CandidateMockAIInterviewController } from './api/controllers/candidate.controller';
import { MockInterviewService } from './api/services/mock-interview.service';
import { AIModule } from 'src/shared/infrastructure/external-services/ai/ai.module';
import { AgentInterviewerService } from './api/services/agent-interviewer.service';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MockInterviewSession,
      InterviewQuestion,
      InterviewResponse,
      InterviewScore,
      InterviewFeedback,
    ]),
    AIModule
  ],
  controllers: [SystemMockAIInterviewController, CandidateMockAIInterviewController], 
  providers: [MockInterviewService, AIService, AgentInterviewerService]
})
export class MockAIInterviewModule {}
