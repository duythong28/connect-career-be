import { InterviewQuestion } from '../../domain/entities/mock_interview_questions.entity';
import { InterviewScore } from '../../domain/entities/mock_interview_scores.entity';
import {
  QuestionType,
  ScoringDimension,
} from '../../domain/value-objects/interview-configuration.vo';

export interface QuestionGenerationContext {
  role: string;
  questionType: QuestionType;
  previousQuestions: InterviewQuestion[];
  candidateProfile?: any;
  difficulty: string;
  focusAreas: string[];
}

export interface EvaluationContext {
  rubric: ScoringRubric;
  questionType: QuestionType;
  expectedKeywords?: string[];
  timeLimit?: number;
}

export interface CoachingContext {
  scores: InterviewScore[];
  sessionGoals: string[];
  candidateLevel: string;
  improvementAreas: string[];
}

export interface ScenarioContext {
  role: string;
  interviewStage: string;
  previousPersonas: string[];
  sessionProgress: number;
}

export interface ScoringRubric {
  dimensions: ScoringDimension[];
  weights: Record<ScoringDimension, number>;
  criteria: Record<ScoringDimension, string[]>;
}
