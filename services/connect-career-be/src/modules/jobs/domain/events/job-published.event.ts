import { IDomainEvent } from "src/shared/domain/interfaces/domain-event.interface";
import { JobStatus } from "../entities/job.entity";

export class JobPublishedEvent implements IDomainEvent {
    public readonly id: string;
    public readonly occurredAt: Date;
  
    constructor(
      public readonly jobId: string,
      public readonly jobTitle: string,
      public readonly organizationId: string,
      public readonly userId: string,
      public readonly status: JobStatus,
    ) {
      // Validate that job is in ACTIVE state
      if (status !== JobStatus.ACTIVE) {
        throw new Error(
          `JobPublishedEvent can only be published for ACTIVE jobs. Current status: ${status}`
        );
      }
      
      this.id = jobId;
      this.occurredAt = new Date();
    }
}