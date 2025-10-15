import { Injectable } from '@nestjs/common';
import { JobStateStrategy } from '../job-state-strategy.interface';
import { Job, JobStatus } from '../../entities/job.entity';
import { JobTransitionContext } from 'src/modules/jobs/api/services/job-state-machine.interface';

@Injectable()
export class ActiveStateStrategy implements JobStateStrategy {
  readonly state = JobStatus.ACTIVE;

  canTransitionTo(targetState: JobStatus): boolean {
    return [
      JobStatus.PAUSED,
      JobStatus.CLOSED,
      JobStatus.EXPIRED,
      JobStatus.CANCELLED,
    ].includes(targetState);
  }

  getAvailableTransitions(): JobStatus[] {
    return [
      JobStatus.PAUSED,
      JobStatus.CLOSED,
      JobStatus.EXPIRED,
      JobStatus.CANCELLED,
    ];
  }

  isTerminal(): boolean {
    return false;
  }

  async onEnter(job: Job, context?: JobTransitionContext): Promise<void> {
    // Job is now live and accepting applications
    // Send notifications, update search indexes, etc.
  }

  async onExit(job: Job, context?: JobTransitionContext): Promise<void> {
    // Job is no longer accepting applications
  }

  async onTransition(
    job: Job,
    targetState: JobStatus,
    context?: JobTransitionContext,
  ): Promise<void> {
    if (targetState === JobStatus.EXPIRED) {
      job.closedDate = new Date();
    }
  }
}
