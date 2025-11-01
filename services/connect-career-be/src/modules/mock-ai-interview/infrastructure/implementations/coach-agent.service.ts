// import { Injectable } from '@nestjs/common';
// import { AIService } from 'src/shared/infrastructure/external-services/ai/ai.service';
// import { InterviewScore } from '../../domain/entities/mock_interview_scores.entity';
// import { MockInterviewSession } from '../../domain/entities/mock_interview_sessions.entity';
// import { InterviewFeedback } from '../../domain/entities/mock_interview_feedback.entity';

// @Injectable()
// export class CoachAgentService {
//   constructor(private aiService: AIService) {}

//   async generateFeedback(
//     scores: InterviewScore[],
//     session: MockInterviewSession,
//   ): Promise<InterviewFeedback[]> {
//     const prompt = this.buildCoachingPrompt(scores, session);
//     const result = await this.aiService.generate({ prompt });
//     return this.parseFeedbackResult(result);
//   }

//   private buildCoachingPrompt(
//     scores: InterviewScore[],
//     session: MockInterviewSession,
//   ): string {
//     return `
//       Generate coaching feedback for this interview session:
//       Role: ${session.role}
//       Scores: ${JSON.stringify(scores)}

//       Provide:
//       - Strengths to highlight
//       - Areas for improvement
//       - Specific action items
//       - Learning recommendations
//     `;
//   }
// }
