import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
  } from '@nestjs/common';
  import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
  } from '@nestjs/swagger';
  import { JwtAuthGuard } from 'src/modules/identity/api/guards/jwt-auth.guard';
  import * as currentUserDecorator from 'src/modules/identity/api/decorators/current-user.decorator';
  import { ReportService } from '../services/report.service';
  import {
    CreateReportDto,
    ReportListQueryDto,
  } from '../dtos/report.dto';
  import { Report } from '../../domain/entities/report.entity';
  import { ReportableEntityType } from '../../domain/entities/report.entity';
  
  @ApiTags('Reports - Candidate')
  @Controller('v1/candidates/reports')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  export class CandidateReportController {
    constructor(private readonly reportService: ReportService) {}
  
    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new report' })
    @ApiResponse({
      status: 201,
      description: 'Report created successfully',
      type: Report,
    })
    createReport(
      @Body() createDto: CreateReportDto,
      @currentUserDecorator.CurrentUser() user: currentUserDecorator.CurrentUserPayload,
    ): Promise<Report | null> {
      return this.reportService.createReport(createDto, user.sub);
    }
  
    @Get('reasons/:entityType')
    @ApiOperation({
      summary: 'Get available report reasons for a specific entity type',
    })
    @ApiParam({
      name: 'entityType',
      enum: ReportableEntityType,
      description: 'Type of entity',
    })
    @ApiResponse({
      status: 200,
      description: 'Reasons retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          entityType: { type: 'string', enum: Object.values(ReportableEntityType) },
          reasons: { type: 'array', items: { type: 'string' } },
        },
      },
    })
    getReasons(@Param('entityType') entityType: ReportableEntityType) {
      const reasons = this.reportService.getReasonsForEntityType(
          entityType
      );
      return { entityType, reasons };
    }
  
    @Get('my-reports')
    @ApiOperation({
      summary: 'Get all reports created by the current user',
    })
    @ApiResponse({
      status: 200,
      description: 'Reports retrieved successfully',
      type: [Report],
    })
    async getMyReports(
      @Query() query: ReportListQueryDto,
      @currentUserDecorator.CurrentUser() user: currentUserDecorator.CurrentUserPayload,
    ) {
      return this.reportService.getMyReports(user.sub, query);
    }
  
    @Get('my-reports/:id')
    @ApiOperation({
      summary: 'Get a specific report by ID (user own reports only)',
    })
    @ApiParam({ name: 'id', description: 'Report ID' })
    @ApiResponse({
      status: 200,
      description: 'Report retrieved successfully',
      type: Report,
    })
    async getMyReportById(
      @Param('id') id: string,
      @currentUserDecorator.CurrentUser() user: currentUserDecorator.CurrentUserPayload,
    ): Promise<Report> {
      return this.reportService.getReportById(id, user.sub, false);
    }
  }