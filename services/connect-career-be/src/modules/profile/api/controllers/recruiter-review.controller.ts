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
import { RecruiterFeedbackService } from '../services/recruiter-feedback.service';
import {
  CreateRecruiterFeedbackDto,
  UpdateRecruiterFeedbackDto,
} from '../dtos/recruiter-feedback.dto';

@ApiTags('Recruiter Feedback')
@Controller('/v1/candidates/recruiter-feedback')
@UseGuards(JwtAuthGuard)
export class RecruiterFeedbackController {
  constructor(
    private readonly recruiterFeedbackService: RecruiterFeedbackService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Submit feedback to Recruiter' })
  @ApiResponse({ status: 201, description: 'Feedback submitted successfully' })
  @ApiResponse({ status: 404, description: 'HR user not found' })
  async createFeedback(
    @Body() dto: CreateRecruiterFeedbackDto,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.recruiterFeedbackService.createFeedback(user.sub, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my HR feedbacks' })
  @ApiResponse({ status: 200, description: 'Feedbacks retrieved successfully' })
  async getMyFeedbacks(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 20,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.recruiterFeedbackService.getRecruiterFeedbacksByCandidate(
      user.sub,
      {
        page,
        limit,
      },
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get HR feedback by ID' })
  @ApiResponse({ status: 200, description: 'Feedback retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Feedback not found' })
  async getFeedbackById(@Param('id', ParseUUIDPipe) id: string) {
    return this.recruiterFeedbackService.getFeedbackById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update my HR feedback' })
  @ApiResponse({ status: 200, description: 'Feedback updated successfully' })
  @ApiResponse({ status: 404, description: 'Feedback not found' })
  async updateFeedback(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecruiterFeedbackDto,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.recruiterFeedbackService.updateFeedback(id, user.sub, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete my HR feedback' })
  @ApiResponse({ status: 200, description: 'Feedback deleted successfully' })
  @ApiResponse({ status: 404, description: 'Feedback not found' })
  async deleteFeedback(
    @Param('id', ParseUUIDPipe) id: string,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    await this.recruiterFeedbackService.deleteFeedback(id, user.sub);
    return { message: 'Feedback deleted successfully' };
  }
}
