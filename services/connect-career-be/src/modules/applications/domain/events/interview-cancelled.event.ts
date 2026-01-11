import { IDomainEvent } from 'src/shared/domain';

export class InterviewCancelledEvent implements IDomainEvent {
  public readonly id: string;
  public readonly occurredAt: Date;

  constructor(
    public readonly interviewId: string,
    public readonly applicationId: string,
    public readonly candidateId: string,
    public readonly jobId: string,
    public readonly jobTitle: string,
    public readonly cancelledBy: string,
    public readonly cancellationReason?: string,
  ) {
    this.id = interviewId;
    this.occurredAt = new Date();
  }
}
