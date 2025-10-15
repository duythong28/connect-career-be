import { Injectable } from '@nestjs/common';
import { JobStateStrategy } from '../job-state-strategy.interface';
import { Job, JobStatus } from '../../entities/job.entity';
import { JobTransitionContext } from 'src/modules/jobs/api/services/job-state-machine.interface';

@Injectable()
export class PendingApprovalStateStrategy implements JobStateStrategy {
  readonly state = JobStatus.PENDING_APPROVAL;

  canTransitionTo(targetState: JobStatus): boolean {
    return [JobStatus.ACTIVE, JobStatus.DRAFT, JobStatus.CANCELLED].includes(
      targetState,
    );
  }

  getAvailableTransitions(): JobStatus[] {
    return [JobStatus.ACTIVE, JobStatus.DRAFT, JobStatus.CANCELLED];
  }

  isTerminal(): boolean {
    return false;
  }

  async onEnter(job: Job, context?: JobTransitionContext): Promise<void> {
    // Send notification to admin/moderator
    // Log approval request
  }

  async onExit(job: Job, context?: JobTransitionContext): Promise<void> {
    // Cleanup pending approval logic
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
