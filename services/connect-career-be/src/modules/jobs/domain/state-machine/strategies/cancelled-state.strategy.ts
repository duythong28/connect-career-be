import { Injectable } from '@nestjs/common';
import { JobStateStrategy } from '../job-state-strategy.interface';
import { Job, JobStatus } from '../../entities/job.entity';
import { JobTransitionContext } from 'src/modules/jobs/api/services/job-state-machine.interface';

@Injectable()
export class CancelledStateStrategy implements JobStateStrategy {
  readonly state = JobStatus.CANCELLED;

  canTransitionTo(targetState: JobStatus): boolean {
    return false; // Terminal state
  }

  getAvailableTransitions(): JobStatus[] {
    return [];
  }

  isTerminal(): boolean {
    return true;
  }

  async onEnter(job: Job, context?: JobTransitionContext): Promise<void> {
    job.closedDate = new Date();
    // Notify candidates, cleanup
  }

  async onExit(job: Job, context?: JobTransitionContext): Promise<void> {
    throw new Error('Cannot exit from terminal state: CANCELLED');
  }

  async onTransition(
    job: Job,
    targetState: JobStatus,
    context?: JobTransitionContext,
  ): Promise<void> {
    throw new Error('Cannot transition from terminal state: CANCELLED');
  }
}
