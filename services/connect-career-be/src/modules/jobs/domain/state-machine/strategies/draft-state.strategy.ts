import { Injectable } from '@nestjs/common';
import { JobStateStrategy } from '../job-state-strategy.interface';
import { Job, JobStatus } from '../../entities/job.entity';
import { JobTransitionContext } from 'src/modules/jobs/api/services/job-state-machine.interface';

@Injectable()
export class DraftStateStrategy implements JobStateStrategy {
  readonly state = JobStatus.DRAFT;

  canTransitionTo(targetState: JobStatus): boolean {
    return [JobStatus.PENDING_APPROVAL, JobStatus.CANCELLED].includes(
      targetState,
    );
  }

  getAvailableTransitions(): JobStatus[] {
    return [JobStatus.PENDING_APPROVAL, JobStatus.CANCELLED];
  }

  isTerminal(): boolean {
    return false;
  }

  async onEnter(job: Job, context?: JobTransitionContext): Promise<void> {
    job.postedDate = undefined;
    job.closedDate = undefined;
  }

  async onExit(job: Job, context?: JobTransitionContext): Promise<void> {
  }

  async onTransition(
    job: Job,
    targetState: JobStatus,
    context?: JobTransitionContext,
  ): Promise<void> {
  }
}
