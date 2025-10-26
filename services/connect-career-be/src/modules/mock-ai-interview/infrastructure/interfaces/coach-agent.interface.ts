import { InterviewFeedback } from '../../domain/entities/mock_interview_feedback.entity';
import { InterviewResponse } from '../../domain/entities/mock_interview_responses.entity';
import { InterviewScore } from '../../domain/entities/mock_interview_scores.entity';
import { CoachingContext } from './context.interface';

export interface ICoachAgent {
  generateFeedback(
    scores: InterviewScore[],
    responses: InterviewResponse[],
    context: CoachingContext,
  ): Promise<InterviewFeedback[]>;
}
