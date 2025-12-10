import { IDomainEvent } from 'src/shared/domain';
import { ApplicationStatus } from '../entities/application.entity';

export class ApplicationStatusChangedEvent implements IDomainEvent {
  public readonly id: string;
  public readonly occurredAt: Date;

  constructor(
    public readonly applicationId: string,
    public readonly candidateId: string,
    public readonly jobId: string,
    public readonly jobTitle: string,
    public readonly oldStatus: ApplicationStatus,
    public readonly newStatus: ApplicationStatus,
    public readonly changedBy: string,
    public readonly reason?: string,
  ) {
    this.id = applicationId;
    this.occurredAt = new Date();
  }
}
