import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/identity/api/guards/jwt-auth.guard';
import { RolesGuard } from 'src/modules/identity/api/guards/roles.guard';
import { Roles } from 'src/modules/identity/api/decorators/roles.decorator';
import * as currentUserDecorator from 'src/modules/identity/api/decorators/current-user.decorator';
import { ReportService } from '../services/report.service';
import {
  UpdateReportDto,
  ReportListQueryDto,
} from '../dtos/report.dto';
import { Report } from '../../domain/entities/report.entity';

@ApiTags('Reports - Backoffice Admin')
@Controller('v1/backoffice/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles('super_admin', 'admin')
export class BackofficeReportController {
  constructor(private readonly reportService: ReportService) { }

  @Get('all')
  @ApiOperation({ summary: 'Get all reports (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Reports retrieved successfully',
    type: [Report],
  })
  async getAllReports(@Query() query: ReportListQueryDto) {
    return this.reportService.getAllReports(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific report by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({
    status: 200,
    description: 'Report retrieved successfully',
    type: Report,
  })
  async getReportById(@Param('id') id: string): Promise<Report> {
    return this.reportService.getReportById(id, '', true);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a report (Admin only)' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({
    status: 200,
    description: 'Report updated successfully',
    type: Report,
  })
  async updateReport(
    @Param('id') id: string,
    @Body() updateDto: UpdateReportDto,
    @currentUserDecorator.CurrentUser() user: currentUserDecorator.CurrentUserPayload,
  ): Promise<Report> {
    return this.reportService.updateReport(id, updateDto, user.sub);
  }

  @Post('refresh-admin-cache')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh admin users cache (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Admin cache refreshed successfully',
  })
  async refreshAdminCache() {
    await this.reportService.refreshAdminCache();
    return { message: 'Admin cache refreshed successfully' };
  }
}