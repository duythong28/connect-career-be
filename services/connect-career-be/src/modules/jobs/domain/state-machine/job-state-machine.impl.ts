import {
  JobStateMachine,
  JobTransitionContext,
} from '../../api/services/job-state-machine.interface';
import { Job, JobStatus } from '../entities/job.entity';
import { JobStateStrategy } from './job-state-strategy.interface';

export class JobStateMachineImpl implements JobStateMachine {
  constructor(
    private readonly job: Job,
    private readonly strategies: Map<JobStatus, JobStateStrategy>,
  ) {}
  getCurrentState(): JobStatus {
    return this.job.status;
  }
  canTransitionTo(targetState: JobStatus): boolean {
    const currentStrategy = this.strategies.get(this.job.status);
    if (!currentStrategy) {
      throw new Error(`No strategy found for state: ${this.job.status}`);
    }
    return currentStrategy.canTransitionTo(targetState);
  }
  getAvailableTransitions(): JobStatus[] {
    const currentStrategy = this.strategies.get(this.job.status);
    if (!currentStrategy) {
      throw new Error(`No strategy found for state: ${this.job.status}`);
    }
    return currentStrategy.getAvailableTransitions();
  }

  async transitionTo(
    targetState: JobStatus,
    context?: JobTransitionContext,
  ): Promise<Job> {
    const currentStrategy = this.strategies.get(this.job.status);
    const targetStrategy = this.strategies.get(targetState);
    if (!currentStrategy || !targetStrategy) {
      throw new Error(
        `No strategy found for state: ${this.job.status} or ${targetState}`,
      );
    }
    if (!currentStrategy.canTransitionTo(targetState)) {
      throw new Error(
        `Invalid transition from ${this.job.status} to ${targetState}. ` +
          `Available transitions: ${currentStrategy.getAvailableTransitions().join(', ')}`,
      );
    }

    await currentStrategy.onExit(this.job, context);
    await targetStrategy.onTransition(this.job, targetState, context);
    await targetStrategy.onEnter(this.job, context);

    return this.job;
  }
}
