import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/modules/identity/api/guards/jwt-auth.guard";
import { ApplicationService } from "../services/application.service";

@Controller('/v1/recruiters/applications')
@UseGuards(JwtAuthGuard)
export class ApplicationRecruiterController {
    constructor(
        private readonly applicationService: ApplicationService,
    ) {}

    @Get()
    
}