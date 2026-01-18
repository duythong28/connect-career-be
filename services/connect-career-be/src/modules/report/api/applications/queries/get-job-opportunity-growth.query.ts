import { IQuery } from '@nestjs/cqrs';

export class GetJobOpportunityGrowthQuery implements IQuery {
  constructor(
    public readonly startDate?: Date,
    public readonly endDate?: Date,
  ) {}
}
