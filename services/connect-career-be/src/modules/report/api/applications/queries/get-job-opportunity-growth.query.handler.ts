import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { GetJobOpportunityGrowthQuery } from "./get-job-opportunity-growth.query";
import { JobStatisticService } from "../../services/job.statis.service";

@QueryHandler(GetJobOpportunityGrowthQuery)
export class GetJobOpportunityGrowthQueryHandler
  implements IQueryHandler<GetJobOpportunityGrowthQuery>
{
  constructor(
    private readonly jobStatisticService: JobStatisticService,
  ) {}

  async execute(query: GetJobOpportunityGrowthQuery) {
    const { startDate, endDate } = query;
    return this.jobStatisticService.getJobOpportunityGrowth(startDate, endDate);
  }
}