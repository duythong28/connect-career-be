import { InterviewQuestion } from '../../domain/entities/mock_interview_questions.entity';
import { InterviewResponse } from '../../domain/entities/mock_interview_responses.entity';
import { InterviewScore } from '../../domain/entities/mock_interview_scores.entity';
import { EvaluationContext } from './context.interface';

export interface IEvaluatorAgent {
  evaluateResponse(
    question: InterviewQuestion,
    response: InterviewResponse,
    context: EvaluationContext,
  ): Promise<InterviewScore[]>;
}
