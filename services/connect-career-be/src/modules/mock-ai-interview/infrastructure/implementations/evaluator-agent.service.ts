// import { Injectable } from '@nestjs/common';
// import { IEvaluatorAgent } from '../interfaces/evaluator-agent.interface';
// import { InterviewQuestion } from '../../domain/entities/mock_interview_questions.entity';
// import { InterviewResponse } from '../../domain/entities/mock_interview_responses.entity';
// import { InterviewScore } from '../../domain/entities/mock_interview_scores.entity';
// import { AIService } from 'src/shared/infrastructure/external-services/ai/ai.service';

// @Injectable()
// export class EvaluatorAgentService implements IEvaluatorAgent {
//   constructor(private aiService: AIService) {}
//   async evaluateResponse(
//     question: InterviewQuestion,
//     response: InterviewResponse,
//   ): Promise<InterviewScore[]> {
//     const prompt = this.buildEvaluationPrompt(question, response);
//     const result = await this.aiService.generate({ prompt });
//     return this.parseEvaluationResult(result);
//   }

//   private buildEvaluationPrompt(
//     question: InterviewQuestion,
//     response: InterviewResponse,
//   ): string {
//     return `
//           Evaluate this interview response:
//           Question: ${question.question}
//           Response: ${response.textResponse}

//           Score on these dimensions (0-100):
//           - Content quality
//           - Communication skills
//           - Technical knowledge
//           - Problem-solving approach

//           Provide scores and rationale for each dimension.
//         `;
//   }
// }
