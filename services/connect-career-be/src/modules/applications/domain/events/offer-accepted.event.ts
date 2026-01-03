import { IDomainEvent } from 'src/shared/domain';

export class OfferAcceptedEvent implements IDomainEvent {
  public readonly id: string;
  public readonly occurredAt: Date;

  constructor(
    public readonly offerId: string,
    public readonly applicationId: string,
    public readonly candidateId: string,
    public readonly jobId: string,
    public readonly jobTitle: string,
    public readonly acceptedBy: string,
  ) {
    this.id = offerId;
    this.occurredAt = new Date();
  }
}
