import { Injectable } from '@nestjs/common';
import { Job, JobStatus } from '../entities/job.entity';
import { JobStateStrategy } from './job-state-strategy.interface';
import { ActiveStateStrategy } from './strategies/active-state.strategy';
import { PendingApprovalStateStrategy } from './strategies/pending-approval-state.strategy';
import { DraftStateStrategy } from './strategies/draft-state.strategy';
import { PausedStateStrategy } from './strategies/paused-state.strategy';
import { ClosedStateStrategy } from './strategies/closed-state.strategy';
import { ExpiredStateStrategy } from './strategies/expired-state.strategy';
import { CancelledStateStrategy } from './strategies/cancelled-state.strategy';
import { ArchivedStateStrategy } from './strategies/archived-state.strategy';
import { JobStateMachine } from '../../api/services/job-state-machine.interface';
import { JobStateMachineImpl } from './job-state-machine.impl';

@Injectable()
export class JobStateMachineFactory {
  private readonly strategies: Map<JobStatus, JobStateStrategy>;
  constructor(
    private readonly draftStrategy: DraftStateStrategy,
    private readonly pendingApprovalStrategy: PendingApprovalStateStrategy,
    private readonly activeStrategy: ActiveStateStrategy,
    private readonly pausedStrategy: PausedStateStrategy,
    private readonly closedStrategy: ClosedStateStrategy,
    private readonly expiredStrategy: ExpiredStateStrategy,
    private readonly cancelledStrategy: CancelledStateStrategy,
    private readonly archivedStrategy: ArchivedStateStrategy,
  ) {
    this.strategies = new Map<JobStatus, JobStateStrategy>([
      [JobStatus.DRAFT, this.draftStrategy as unknown as JobStateStrategy],
      [JobStatus.PENDING_APPROVAL, this.pendingApprovalStrategy as JobStateStrategy],
      [JobStatus.ACTIVE, this.activeStrategy as JobStateStrategy],
      [JobStatus.PAUSED, this.pausedStrategy as JobStateStrategy],
      [JobStatus.CLOSED, this.closedStrategy],
      [JobStatus.EXPIRED, this.expiredStrategy],
      [JobStatus.CANCELLED, this.cancelledStrategy],
      [JobStatus.ARCHIVED, this.archivedStrategy],
    ]);
  }
  createStateMachine(job: Job): JobStateMachine {
    return new JobStateMachineImpl(job, this.strategies);
  }

  getStrategy(state: JobStatus): JobStateStrategy {
    const strategy = this.strategies.get(state);
    if (!strategy) {
      throw new Error(`No strategy found for state: ${state}`);
    }
    return strategy;
  }
}
