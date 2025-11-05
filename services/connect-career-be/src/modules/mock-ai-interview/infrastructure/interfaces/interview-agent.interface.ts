import { InterviewQuestion } from '../../domain/entities/mock_interview_questions.entity';
import { QuestionContext } from '../../domain/value-objects/interview-configuration.vo';
import { QuestionGenerationContext } from './context.interface';

export interface IInterviewerAgent {
  generateQuestion(
    context: QuestionGenerationContext,
  ): Promise<InterviewQuestion>;

  generateFollowUp(
    originalQuestion: string,
    response: string,
    context: QuestionContext,
  ): Promise<InterviewQuestion>;
}
