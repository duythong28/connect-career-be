import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetIndustryStatisticQuery } from './get-industry-statistic.query';
import { IndustryStatisticService } from '../../services/industry.statistic.service';

@QueryHandler(GetIndustryStatisticQuery)
export class GetIndustryStatisticQueryHandler
  implements IQueryHandler<GetIndustryStatisticQuery>
{
  constructor(
    private readonly industryStatisticService: IndustryStatisticService,
  ) {}

  async execute(query: GetIndustryStatisticQuery) {
    const { startDate, endDate, industryId } = query;
    return this.industryStatisticService.getIndustryStatistics(
      startDate,
      endDate,
      industryId,
    );
  }
}