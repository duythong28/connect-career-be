import { JobTransitionContext } from '../../api/services/job-state-machine.interface';
import { Job, JobStatus } from '../entities/job.entity';

export interface JobStateStrategy {
  readonly state: JobStatus;
  canTransitionTo(targetState: JobStatus): boolean;
  onEnter(job: Job, context?: JobTransitionContext): Promise<void>;
  onExit(job: Job, context?: JobTransitionContext): Promise<void>;
  onTransition(
    job: Job,
    targetState: JobStatus,
    context?: JobTransitionContext,
  ): Promise<void>;
  getAvailableTransitions(): JobStatus[];
  isTerminal(): boolean;
}
