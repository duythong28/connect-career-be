export interface InterviewConfiguration {
  duration: number;
  difficulty: Difficulty;
  focusAreas: string[];
  audioEnabled: boolean;
  realtimeScoring: boolean;
}

export interface InterviewResults {
  overallScore: number;
  dimensionScores: Record<ScoringDimension, number>;
  strengths: string[];
  weaknesses: string[];
  recommendation: string[];
  learningTags: string[];
  transcript: string;
  duration: number;
}

export interface QuestionContext {
  previousAnswers?: string[];
  followUpReason?: string;
  scenarioDetails?: Record<string, any>;
}

export interface SentimentAnalysis {
  sentimentScore: number;
  sentiment: Sentiment;
  confidenceScore: number;
  emotions: string[];
  energyScore: number;
}

export interface ScoreDetails {
  criteria: string[];
  evidence: string[];
  suggestions: string[];
}

export interface ActionItem {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  learningResourceId?: string;
}

export enum Sentiment {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral',
}

export enum Difficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}
export enum InterviewSessionStatus {
  CREATED = 'created',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum QuestionType {
  OPENER = 'opener',
  CLOSING = 'closing',

  BEHAVIORAL = 'behavioral',
  SITUATIONAL = 'situational',

  MOTIVATIONAL = 'motivational',
  CULTURAL_FIT = 'cultural_fit',
  PROCESS = 'process',

  THEORETICAL = 'theoretical',
  CODING_CHALLENGE = 'coding_challenge',
  SYSTEM_DESIGN = 'system_design',
  TECHNICAL = 'technical',
  SCENARIO = 'scenario',

  FOLLOW_UP = 'follow_up',
}

export enum ScoringDimension {
  CONTENT = 'content',
  DEPTH = 'depth',
  COMMUNICATION = 'communication',
  TECHNICAL_SKILLS = 'technical_skills',
  PROBLEM_SOLVING = 'problem_solving',
  LEADERSHIP = 'leadership',
  TIME_MANAGEMENT = 'time_management',
  CONFIDENCE = 'confidence',
}

export enum FeedbackType {
  COACHING = 'coaching',
  IMPROVEMENT = 'improvement',
  STRENGTH = 'strength',
  ACTION_ITEM = 'action_item',
}

export enum PersonaCategory {
  GENERAL = 'GENERAL',
  ENGINEERING = 'ENGINEERING',
  MARKETING = 'MARKETING',
  SALES = 'SALES',
  FINANCE = 'FINANCE',
  DESIGN = 'DESIGN',
  HR = 'HR',
  CUSTOMER_SUPPORT = 'CUSTOMER_SUPPORT',
}
