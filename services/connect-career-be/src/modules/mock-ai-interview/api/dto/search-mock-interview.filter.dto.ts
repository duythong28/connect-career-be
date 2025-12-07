import { InterviewSessionStatus } from '../../domain/value-objects/interview-configuration.vo';

export interface MockInterviewSearchFilters {
  candidateId?: string;
  status?: InterviewSessionStatus;
  role?: string;
  scenario?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  completedAfter?: Date;
  completedBefore?: Date;
}
