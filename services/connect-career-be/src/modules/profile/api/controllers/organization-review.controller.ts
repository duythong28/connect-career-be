import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/identity/api/guards/jwt-auth.guard';
import * as decorators from 'src/modules/identity/api/decorators';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrganizationReviewService } from '../services/organization-review.service';
import {
  CreateOrganizationReviewDto,
  UpdateOrganizationReviewDto,
} from '../dtos/organization-review.dto';

@ApiTags('Organization Reviews')
@Controller('/v1/candidates/organization-reviews')
@UseGuards(JwtAuthGuard)
export class OrganizationReviewController {
  constructor(
    private readonly organizationReviewService: OrganizationReviewService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a company review' })
  @ApiResponse({ status: 201, description: 'Review created successfully' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async createReview(
    @Body() dto: CreateOrganizationReviewDto,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.organizationReviewService.createReview(user.sub, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my organization reviews' })
  @ApiResponse({ status: 200, description: 'Reviews retrieved successfully' })
  async getMyOrganizationReviews(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 20,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.organizationReviewService.getReviewsByCandidate(user.sub, {
      page,
      limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a company review by ID' })
  @ApiResponse({ status: 200, description: 'Review retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async getOrganizationReviewById(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizationReviewService.getReviewById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update my company review' })
  @ApiResponse({ status: 200, description: 'Review updated successfully' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async updateOrganizationReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationReviewDto,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.organizationReviewService.updateReview(id, user.sub, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete my company review' })
  @ApiResponse({ status: 200, description: 'Review deleted successfully' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async deleteReview(
    @Param('id', ParseUUIDPipe) id: string,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    await this.organizationReviewService.deleteReview(id, user.sub);
    return { message: 'Review deleted successfully' };
  }

  @Get('organizations/:organizationId')
  @ApiOperation({ summary: 'Get reviews for a specific organization' })
  @ApiResponse({ status: 200, description: 'Reviews retrieved successfully' })
  async getReviewsByOrganization(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 20,
  ) {
    return this.organizationReviewService.getReviewsByOrganization(
      organizationId,
      {
        page,
        limit,
      },
    );
  }

  @Get('organizations/:organizationId/stats')
  @ApiOperation({ summary: 'Get review statistics for an organization' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getOrganizationReviewStats(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.organizationReviewService.getOrganizationReviewStats(
      organizationId,
    );
  }
}
