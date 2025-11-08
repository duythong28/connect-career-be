import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IndustryService } from '../services/industry.service';
import { IndustryQueryDto } from '../dtos/industry-query.dto';
import { Industry } from '../../domain/entities/industry.entity';
import { Public } from 'src/modules/identity/api/decorators';
import { JwtAuthGuard } from 'src/modules/identity/api/guards/jwt-auth.guard';
import {
  CreateIndustryDto,
  UpdateIndustryDto,
} from '../dtos/industry.crud.dto';

@ApiTags('Industries')
@Controller('/v1/industries')
export class IndustryController {
  constructor(private readonly industryService: IndustryService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all industries' })
  @ApiResponse({
    status: 200,
    description: 'Industries retrieved successfully',
    type: [Industry],
  })
  async getAllIndustries(@Query() query: IndustryQueryDto) {
    return this.industryService.getAllIndustries(query);
  }

  @Get('parents')
  @Public()
  @ApiOperation({ summary: 'Get all parent industries (top-level)' })
  @ApiResponse({
    status: 200,
    description: 'Parent industries retrieved successfully',
    type: [Industry],
  })
  async getParentIndustries() {
    return this.industryService.getParentIndustries();
  }

  @Get('tree')
  @Public()
  @ApiOperation({ summary: 'Get industries as a hierarchical tree' })
  @ApiResponse({
    status: 200,
    description: 'Industries tree retrieved successfully',
    type: [Industry],
  })
  async getIndustriesTree() {
    return this.industryService.getIndustriesTree();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get industry by ID' })
  @ApiParam({ name: 'id', description: 'Industry ID' })
  @ApiResponse({
    status: 200,
    description: 'Industry retrieved successfully',
    type: Industry,
  })
  @ApiResponse({ status: 404, description: 'Industry not found' })
  async getIndustryById(@Param('id', ParseUUIDPipe) id: string) {
    return this.industryService.getIndustryById(id);
  }

  @Get(':id/children')
  @Public()
  @ApiOperation({ summary: 'Get child industries for a parent industry' })
  @ApiParam({ name: 'id', description: 'Parent Industry ID' })
  @ApiResponse({
    status: 200,
    description: 'Child industries retrieved successfully',
    type: [Industry],
  })
  @ApiResponse({ status: 404, description: 'Parent industry not found' })
  async getChildIndustries(@Param('id', ParseUUIDPipe) id: string) {
    // Verify parent exists
    await this.industryService.getIndustryById(id);
    return this.industryService.getChildIndustries(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new industry' })
  @ApiResponse({
    status: 201,
    description: 'Industry created successfully',
    type: Industry,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Parent industry not found' })
  async createIndustry(@Body() createIndustryDto: CreateIndustryDto) {
    return this.industryService.createIndustry(createIndustryDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an industry' })
  @ApiParam({ name: 'id', description: 'Industry ID' })
  @ApiResponse({
    status: 200,
    description: 'Industry updated successfully',
    type: Industry,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Industry not found' })
  async updateIndustry(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateIndustryDto: UpdateIndustryDto,
  ) {
    return this.industryService.updateIndustry(id, updateIndustryDto);
  }
}
