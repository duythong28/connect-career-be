import { IEvent } from '@nestjs/cqrs';

export interface IDomainEvent extends IEvent {
  // Add any additional properties or methods specific to your domain events
  readonly id: string;
  readonly occurredAt: Date;
}
