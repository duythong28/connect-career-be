import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CVService } from '../services/cv.service';
import { JwtAuthGuard } from 'src/modules/identity/api/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { UploadCVDto } from '../dtos/cv.create.dto';
import * as decorators from 'src/modules/identity/api/decorators';
import { PaginatedResult } from 'src/shared/domain/interfaces/base.repository';
import { CV } from '../../domain/entities/cv.entity';
import { UpdateCVDto } from '../dtos/cv.create-from-template.dto';

@Controller('v1/cvs/candidate')
@ApiBearerAuth()
export class CVCandidateController {
  constructor(private readonly cvService: CVService) {}
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Upload CV' })
  @ApiResponse({ status: 201, description: 'CV uploaded successfully' })
  async uploadCV(
    @Body() uploadCVDto: UploadCVDto,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.cvService.uploadCV(uploadCVDto, user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get CV by ID' })
  @ApiResponse({ status: 200, description: 'CV retrieved successfully' })
  async getCVByUserId(
    @Param('id') id: string,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.cvService.getCVsByCandidateId(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all my CVs' })
  @ApiResponse({ status: 200, description: 'CVs retrieved successfully' })
  async getMyCVs(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ): Promise<PaginatedResult<CV>> {
    return this.cvService.getCVsByCandidateId(user.sub);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update CV' })
  @ApiResponse({ status: 200, description: 'CV updated successfully' })
  async updateCV(
    @Param('id') id: string,
    @Body() updateCVDto: UpdateCVDto,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.cvService.updateCV(id, updateCVDto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete CV' })
  @ApiParam({ name: 'id', description: 'CV UUID' })
  @ApiResponse({ status: 200, description: 'CV deleted successfully' })
  @ApiResponse({ status: 404, description: 'CV not found' })
  async deleteCV(
    @Param('id', ParseUUIDPipe) id: string,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ): Promise<{ message: string }> {
    await this.cvService.deleteCV(id, user);
    return { message: 'CV deleted successfully' };
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download CV file' })
  @ApiParam({ name: 'id', description: 'CV UUID' })
  @ApiResponse({
    status: 200,
    description: 'Download URL generated successfully',
  })
  @ApiResponse({ status: 404, description: 'CV not found' })
  async downloadCV(
    @Param('id', ParseUUIDPipe) id: string,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ): Promise<{ url: string; filename: string }> {
    return this.cvService.downloadCV(id, user);
  }

  @Patch(':id/publish')
  @ApiOperation({ summary: 'Publish/unpublish CV' })
  @ApiParam({ name: 'id', description: 'CV UUID' })
  @ApiResponse({ status: 200, description: 'CV publication status updated' })
  @ApiResponse({ status: 404, description: 'CV not found' })
  async togglePublishCV(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() publishData: { isPublic: boolean },
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ): Promise<CV> {
    return this.cvService.publishCV(id, publishData.isPublic, user);
  }
}
