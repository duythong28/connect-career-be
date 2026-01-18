import { IQuery } from '@nestjs/cqrs';

export class GetIndustryStatisticQuery implements IQuery {
  constructor(
    public readonly startDate: Date,
    public readonly endDate: Date,
    public readonly industryId?: string,
  ) {}
}
