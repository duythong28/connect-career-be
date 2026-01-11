import { Controller, Get, Query } from "@nestjs/common";
import { BillableActionsService } from "../services/billable-action.service";
import { ApiOperation, ApiResponse } from "@nestjs/swagger";
import { BillableActionsListQueryDto } from "../dtos/billable-actions.dto";
import { Public } from "src/modules/identity/api/decorators/public.decorator";

@Controller('/v1/public/billable-actions')
@Public()
export class PublicController {
    constructor(private readonly billableActionsService: BillableActionsService) {}
    @Get()
    @ApiOperation({ summary: 'Get all billable actions' })
    @ApiResponse({ status: 200, description: 'List of billable actions' })
    async getBillableActions(
        @Query() query: BillableActionsListQueryDto
    ) {
        return this.billableActionsService.findAll(query);
    }
}
