import { Injectable } from '@nestjs/common';
import { JobStateStrategy } from '../job-state-strategy.interface';
import { Job, JobStatus } from '../../entities/job.entity';
import { JobTransitionContext } from 'src/modules/jobs/api/services/job-state-machine.interface';

@Injectable()
export class ClosedStateStrategy implements JobStateStrategy {
  readonly state = JobStatus.CLOSED;

  canTransitionTo(targetState: JobStatus): boolean {
    return [JobStatus.ACTIVE, JobStatus.ARCHIVED].includes(targetState);
  }

  getAvailableTransitions(): JobStatus[] {
    return [JobStatus.ACTIVE, JobStatus.ARCHIVED];
  }

  isTerminal(): boolean {
    return false;
  }

  async onEnter(job: Job, context?: JobTransitionContext): Promise<void> {
    job.closedDate = new Date();
    // Notify candidates, update analytics
  }

  async onExit(job: Job, context?: JobTransitionContext): Promise<void> {
    job.closedDate = undefined;
  }

  async onTransition(
    job: Job,
    targetState: JobStatus,
    context?: JobTransitionContext,
  ): Promise<void> {
    if (targetState === JobStatus.ACTIVE) {
      job.postedDate = new Date();
    }
  }
}
