import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetTodayJobStatisticQuery } from './get-today-job-statistic.query';

@QueryHandler(GetTodayJobStatisticQuery)
export class GetTodayJobStatisticQueryHandler
  implements IQueryHandler<GetTodayJobStatisticQuery>
{
  constructor() {}

  async execute(query: GetTodayJobStatisticQuery) {}
}
