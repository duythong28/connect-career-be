import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { Role, User } from '../identity/domain/entities';
import { ReportService } from './api/services/report.service';
import { CandidateReportController } from './api/controllers/candidate.controller';
import { RecruiterReportController } from './api/controllers/recruiter.controller';
import { Report } from './domain/entities/report.entity';
import { BackofficeReportController } from './api/controllers/backoffice.controller';
import { PublicReportController } from './api/controllers/public.controller';
import { IdentityModule } from '../identity/identity.module';
import { Job } from '../jobs/domain/entities/job.entity';
import { Organization } from '../profile/domain/entities/organization.entity';
import { Industry } from '../profile/domain/entities/industry.entity';
import { IndustryStatisticService } from './api/services/industry.statistic.service';
import { JobStatisticService } from './api/services/job.statis.service';
import { GetIndustryStatisticQueryHandler } from './api/applications/queries/get-industry-statistic.query.handler';
import { GetJobOpportunityGrowthQueryHandler } from './api/applications/queries/get-job-opportunity-growth.query.handler';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([Report, User, Role, Job, Organization, Industry]),
    IdentityModule,
  ],
  controllers: [
    BackofficeReportController,
    CandidateReportController,
    RecruiterReportController,
    PublicReportController,
  ],
  providers: [
    ReportService,
    IndustryStatisticService,
    JobStatisticService,
    GetIndustryStatisticQueryHandler,
    GetJobOpportunityGrowthQueryHandler,
  ],
  exports: [ReportService],
})
export class ReportModule {}