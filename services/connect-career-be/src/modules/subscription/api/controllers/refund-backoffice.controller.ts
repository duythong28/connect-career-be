import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Put,
    Query,
    UseGuards,
  } from '@nestjs/common';
  import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
  } from '@nestjs/swagger';
  import { JwtAuthGuard } from 'src/modules/identity/api/guards/jwt-auth.guard';
  import { RolesGuard } from 'src/modules/identity/api/guards/roles.guard';
  import { Roles } from 'src/modules/identity/api/decorators/roles.decorator';
  import * as currentUserDecorator from 'src/modules/identity/api/decorators/current-user.decorator';
  import { RefundBackofficeService } from '../services/refund-backoffice.service';
  import {
    CreateRefundDto,
    ProcessRefundDto,
    RefundListQueryDto,
    RejectRefundDto,
    ReverseRefundDto,
  } from '../dtos/refund.dto';
  import { Refund } from '../../domain/entities/refund.entity';
  
  @ApiTags('BackOffice - Refund Management')
  @Controller('v1/backoffice/refunds')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles('super_admin', 'admin')
  export class RefundBackofficeController {
    constructor(
      private readonly refundBackofficeService: RefundBackofficeService,
    ) {}
  
    @Get()
    @ApiOperation({ summary: 'Get all refund requests' })
    @ApiResponse({
      status: 200,
      description: 'List of refunds retrieved successfully',
    })
    async getRefunds(@Query() query: RefundListQueryDto) {
      return this.refundBackofficeService.getRefunds(query);
    }
  
    @Get('statistics')
    @ApiOperation({ summary: 'Get refund statistics' })
    @ApiQuery({ name: 'dateFrom', required: false, type: String })
    @ApiQuery({ name: 'dateTo', required: false, type: String })
    @ApiQuery({ name: 'userId', required: false, type: String })
    @ApiQuery({ name: 'minAmount', required: false, type: Number })
    @ApiQuery({ name: 'maxAmount', required: false, type: Number })
    @ApiResponse({
      status: 200,
      description: 'Refund statistics retrieved successfully',
    })
    async getRefundStatistics(@Query() query: RefundListQueryDto) {
      return this.refundBackofficeService.getStatistics(query);
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Get refund details by ID' })
    @ApiParam({ name: 'id', description: 'Refund ID' })
    @ApiResponse({
      status: 200,
      description: 'Refund details retrieved successfully',
      type: Refund,
    })
    @ApiResponse({ status: 404, description: 'Refund not found' })
    async getRefundById(@Param('id') id: string) {
      return this.refundBackofficeService.getRefundById(id);
    }
  
    @Post()
    @ApiOperation({ summary: 'Create manual refund' })
    @ApiResponse({
      status: 201,
      description: 'Refund created and processed successfully',
      type: Refund,
    })
    @ApiResponse({ status: 400, description: 'Invalid refund request' })
    @ApiResponse({ status: 404, description: 'Payment transaction not found' })
    async createRefund(
      @Body() dto: CreateRefundDto,
      @currentUserDecorator.CurrentUser() admin: currentUserDecorator.CurrentUserPayload,
    ) {
      return this.refundBackofficeService.createRefund(dto, admin.sub);
    }
  
    @Put(':id/process')
    @ApiOperation({ summary: 'Process refund request' })
    @ApiParam({ name: 'id', description: 'Refund ID' })
    @ApiResponse({
      status: 200,
      description: 'Refund processed successfully',
      type: Refund,
    })
    @ApiResponse({ status: 400, description: 'Refund cannot be processed' })
    @ApiResponse({ status: 404, description: 'Refund not found' })
    async processRefund(
      @Param('id') id: string,
      @Body() dto: ProcessRefundDto,
      @currentUserDecorator.CurrentUser() admin: currentUserDecorator.CurrentUserPayload,
    ) {
      return this.refundBackofficeService.processRefund(id, dto, admin.sub);
    }
  
    @Put(':id/reject')
    @ApiOperation({ summary: 'Reject refund request' })
    @ApiParam({ name: 'id', description: 'Refund ID' })
    @ApiResponse({
      status: 200,
      description: 'Refund rejected successfully',
      type: Refund,
    })
    @ApiResponse({ status: 400, description: 'Refund cannot be rejected' })
    @ApiResponse({ status: 404, description: 'Refund not found' })
    async rejectRefund(
      @Param('id') id: string,
      @Body() dto: RejectRefundDto,
      @currentUserDecorator.CurrentUser() admin: currentUserDecorator.CurrentUserPayload,
    ) {
      return this.refundBackofficeService.rejectRefund(id, dto, admin.sub);
    }
  
    @Put(':id/reverse')
    @ApiOperation({ summary: 'Reverse processed refund (Not yet implemented)' })
    @ApiParam({ name: 'id', description: 'Refund ID' })
    @ApiResponse({
      status: 501,
      description: 'Reverse refund functionality not yet implemented',
    })
    async reverseRefund(
      @Param('id') id: string,
      @Body() dto: ReverseRefundDto,
      @currentUserDecorator.CurrentUser() admin: currentUserDecorator.CurrentUserPayload,
    ) {
      // TODO: Implement reverse refund functionality
      throw new Error('Reverse refund functionality not yet implemented');
    }
  }