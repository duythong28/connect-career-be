import { Injectable } from '@nestjs/common';
import { JobStateStrategy } from '../job-state-strategy.interface';
import { Job, JobStatus } from '../../entities/job.entity';
import { JobTransitionContext } from 'src/modules/jobs/api/services/job-state-machine.interface';

@Injectable()
export class ArchivedStateStrategy implements JobStateStrategy {
  readonly state = JobStatus.ARCHIVED;

  canTransitionTo(targetState: JobStatus): boolean {
    return [JobStatus.ACTIVE].includes(targetState);
  }

  getAvailableTransitions(): JobStatus[] {
    return [JobStatus.ACTIVE];
  }

  isTerminal(): boolean {
    return false; // Can be reactivated
  }

  async onEnter(job: Job, context?: JobTransitionContext): Promise<void> {
    // Archive job data, cleanup
  }

  async onExit(job: Job, context?: JobTransitionContext): Promise<void> {
    // Reactivate archived job
  }

  async onTransition(
    job: Job,
    targetState: JobStatus,
    context?: JobTransitionContext,
  ): Promise<void> {
    if (targetState === JobStatus.ACTIVE) {
      job.postedDate = new Date();
      job.closedDate = undefined;
    }
  }
}
