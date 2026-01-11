import { IDomainEvent } from 'src/shared/domain';

export class ApplicationMatchingScoreRequestedEvent implements IDomainEvent {
  public readonly id: string;
  public readonly occurredAt: Date;

  constructor(
    public readonly applicationId: string,
    public readonly jobId: string,
    public readonly cvId?: string,
    public readonly candidateProfileId?: string,
    public readonly forceRecalculation: boolean = false,
  ) {
    this.id = applicationId;
    this.applicationId = applicationId;
    this.jobId = jobId;
    this.cvId = cvId;
    this.candidateProfileId = candidateProfileId;
    this.forceRecalculation = forceRecalculation;
    this.occurredAt = new Date();
  }
}
