import { Injectable } from '@nestjs/common';
import { JobStateStrategy } from '../job-state-strategy.interface';
import { Job, JobStatus } from '../../entities/job.entity';
import { JobTransitionContext } from 'src/modules/jobs/api/services/job-state-machine.interface';

@Injectable()
export class PausedStateStrategy implements JobStateStrategy {
  readonly state = JobStatus.PAUSED;

  canTransitionTo(targetState: JobStatus): boolean {
    return [JobStatus.ACTIVE, JobStatus.CLOSED, JobStatus.CANCELLED].includes(
      targetState,
    );
  }

  getAvailableTransitions(): JobStatus[] {
    return [JobStatus.ACTIVE, JobStatus.CLOSED, JobStatus.CANCELLED];
  }

  isTerminal(): boolean {
    return false;
  }

  async onEnter(job: Job, context?: JobTransitionContext): Promise<void> {
    // Temporarily not accepting applications
    // Update job visibility
  }

  async onExit(job: Job, context?: JobTransitionContext): Promise<void> {
    // Resume accepting applications
  }

  async onTransition(
    job: Job,
    targetState: JobStatus,
    context?: JobTransitionContext,
  ): Promise<void> {
    // Paused state transition logic
  }
}
