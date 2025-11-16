import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Role, User } from "../identity/domain/entities";
import { ReportService } from "./api/services/report.service";
import { CandidateReportController } from "./api/controllers/candidate.controller";
import { RecruiterReportController } from "./api/controllers/recruiter.controller";
import { Report } from "./domain/entities/report.entity";
import { BackofficeReportController } from "./api/controllers/backoffice.controller";
import { IdentityModule } from "../identity/identity.module";

@Module({
    imports: [
        TypeOrmModule.forFeature([Report, User, Role]),
        IdentityModule,
    ],
    controllers: [BackofficeReportController, CandidateReportController, RecruiterReportController],
    providers: [ReportService],
    exports: [ReportService],
})
export class ReportModule {}