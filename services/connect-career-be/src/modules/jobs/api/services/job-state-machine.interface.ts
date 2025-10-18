import { Job, JobStatus } from '../../domain/entities/job.entity';

export interface JobStateMachine {
  getCurrentState(): JobStatus;
  canTransitionTo(status: JobStatus): boolean;
  getAvailableTransitions(): JobStatus[];
  transitionTo(status: JobStatus, context?: JobTransitionContext): Promise<Job>;
}

export interface JobTransitionContext {
  userId: string;
  reason?: string;
  metadata?: Record<string, any>;
}
