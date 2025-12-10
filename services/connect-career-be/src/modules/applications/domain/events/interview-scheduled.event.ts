import { IDomainEvent } from 'src/shared/domain';
import { InterviewType } from '../entities/interview.entity';

export class InterviewScheduledEvent implements IDomainEvent {
  public readonly id: string;
  public readonly occurredAt: Date;

  constructor(
    public readonly interviewId: string,
    public readonly applicationId: string,
    public readonly candidateId: string,
    public readonly jobId: string,
    public readonly jobTitle: string,
    public readonly scheduledDate: Date,
    public readonly interviewType: InterviewType,
    public readonly interviewerId?: string,
    public readonly interviewerName?: string,
    public readonly location?: string,
    public readonly meetingLink?: string,
    public readonly duration?: number,
  ) {
    this.id = interviewId;
    this.occurredAt = new Date();
  }
}
