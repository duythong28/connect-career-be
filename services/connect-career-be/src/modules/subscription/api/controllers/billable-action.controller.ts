import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  CreateBillableActionDto,
  UpdateBillableActionDto,
  UpdateBillableActionStatusDto,
  BillableActionsListQueryDto,
} from '../dtos/billable-actions.dto';
import { BillableAction } from '../../domain/entities/billable-action.entity';
import { BillableActionsService } from '../services/billable-action.service';

@ApiTags('Admin - Billable Actions')
@ApiBearerAuth()
@Controller('/v1/backoffice/billable-actions')
export class BillableActionsController {
  constructor(
    private readonly billableActionsService: BillableActionsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all billable actions (Admin)' })
  @ApiResponse({ status: 200, description: 'List of billable actions' })
  async findAll(@Query() query: BillableActionsListQueryDto) {
    return this.billableActionsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get billable action by ID (Admin)' })
  @ApiResponse({ status: 200, description: 'Billable action details' })
  @ApiResponse({ status: 404, description: 'Billable action not found' })
  async findOne(@Param('id') id: string): Promise<BillableAction> {
    return this.billableActionsService.findOne(id);
  }

  @Get('code/:actionCode')
  @ApiOperation({ summary: 'Get billable action by code (Admin)' })
  @ApiResponse({ status: 200, description: 'Billable action details' })
  @ApiResponse({ status: 404, description: 'Billable action not found' })
  async findByCode(
    @Param('actionCode') actionCode: string,
  ): Promise<BillableAction> {
    return this.billableActionsService.findByCode(actionCode);
  }

  @Post()
  @ApiOperation({ summary: 'Create new billable action (Admin)' })
  @ApiResponse({ status: 201, description: 'Billable action created' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or duplicate action code',
  })
  async create(@Body() dto: CreateBillableActionDto): Promise<BillableAction> {
    return this.billableActionsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update billable action (Admin)' })
  @ApiResponse({ status: 200, description: 'Billable action updated' })
  @ApiResponse({ status: 404, description: 'Billable action not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBillableActionDto,
  ): Promise<BillableAction> {
    return this.billableActionsService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update billable action status (Admin)' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  @ApiResponse({ status: 404, description: 'Billable action not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBillableActionStatusDto,
  ): Promise<BillableAction> {
    return this.billableActionsService.updateStatus(id, dto);
  }

  @Patch(':id/price')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update billable action price (Admin)' })
  @ApiResponse({ status: 200, description: 'Price updated' })
  @ApiResponse({ status: 404, description: 'Billable action not found' })
  @ApiResponse({ status: 400, description: 'Invalid price' })
  async updatePrice(
    @Param('id') id: string,
    @Body() body: { cost: number },
  ): Promise<BillableAction> {
    return this.billableActionsService.updatePrice(id, body.cost);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete billable action (Admin)' })
  @ApiResponse({ status: 204, description: 'Billable action deleted' })
  @ApiResponse({ status: 404, description: 'Billable action not found' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.billableActionsService.delete(id);
  }
}
