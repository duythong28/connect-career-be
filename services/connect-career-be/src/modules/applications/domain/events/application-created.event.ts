import { IDomainEvent } from 'src/shared/domain';

export class ApplicationCreatedEvent implements IDomainEvent {
  public readonly id: string;
  public readonly occurredAt: Date;

  constructor(
    public readonly applicationId: string,
    public readonly candidateId: string,
    public readonly jobId: string,
    public readonly jobTitle: string,
    public readonly recruiterId?: string,
  ) {
    this.id = applicationId;
    this.occurredAt = new Date();
  }
}
