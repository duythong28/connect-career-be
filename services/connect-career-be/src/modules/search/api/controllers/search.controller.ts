import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SearchService } from '../../infrastructure/search/search.service';
import { SemanticSearchService } from '../../infrastructure/semantic/semantic-search.service';
import { GlobalSearchDto } from '../dtos/global-search.dto';
import { AutocompleteDto } from '../dtos/autocomplete.dto';
import { SemanticSearchDto } from '../dtos/semantic-search.dto';
import * as decorators from 'src/modules/identity/api/decorators';

@ApiTags('Search')
@Controller('/v1/search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly semanticSearchService: SemanticSearchService,
  ) {}

  @Get()
  @decorators.Public()
  @ApiOperation({
    summary: 'Global search across jobs, organizations, and people',
    description:
      'Search across all content types (jobs, organizations, people) or filter by specific type. Similar to LinkedIn search functionality.',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results across all types',
    schema: {
      type: 'object',
      properties: {
        jobs: {
          type: 'object',
          properties: {
            items: { type: 'array' },
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
        organizations: {
          type: 'object',
          properties: {
            items: { type: 'array' },
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
        people: {
          type: 'object',
          properties: {
            items: { type: 'array' },
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  async globalSearch(@Query() dto: GlobalSearchDto) {
    return this.searchService.globalSearch(dto);
  }

  @Get('jobs')
  @decorators.Public()
  @ApiOperation({
    summary: 'Search jobs only',
    description: 'Search for jobs using Elasticsearch',
  })
  async searchJobs(@Query() dto: GlobalSearchDto) {
    return this.searchService.globalSearch({
      ...dto,
      type: 'jobs' as any,
    });
  }

  @Get('organizations')
  @decorators.Public()
  @ApiOperation({
    summary: 'Search organizations only',
    description: 'Search for organizations using Elasticsearch',
  })
  async searchOrganizations(@Query() dto: GlobalSearchDto) {
    return this.searchService.globalSearch({
      ...dto,
      type: 'organizations' as any,
    });
  }

  @Get('people')
  @decorators.Public()
  @ApiOperation({
    summary: 'Search people only',
    description: 'Search for people/candidates using Elasticsearch',
  })
  async searchPeople(@Query() dto: GlobalSearchDto) {
    return this.searchService.globalSearch({
      ...dto,
      type: 'people' as any,
    });
  }

  @Get('autocomplete')
  @decorators.Public()
  @ApiOperation({
    summary: 'Get autocomplete suggestions',
    description:
      'Get search autocomplete suggestions as user types. Returns suggestions for jobs and organizations.',
  })
  @ApiResponse({
    status: 200,
    description: 'Autocomplete suggestions',
    schema: {
      type: 'object',
      properties: {
        suggestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string', example: 'Software Engineer' },
              type: { type: 'string', enum: ['job', 'organization'] },
              id: { type: 'string', example: 'uuid-here' },
              score: { type: 'number', example: 1.5 },
            },
          },
        },
      },
    },
  })
  async autocomplete(@Query() dto: AutocompleteDto) {
    return this.searchService.autocomplete(dto);
  }

  @Get('semantic/jobs')
  @decorators.Public()
  @ApiOperation({
    summary: 'Semantic search for jobs',
    description:
      'Search for jobs using semantic similarity based on embeddings. Returns jobs ranked by semantic similarity to the query.',
  })
  @ApiResponse({
    status: 200,
    description: 'Semantic job search results',
  })
  async semanticSearchJobs(@Query() dto: SemanticSearchDto) {
    return this.semanticSearchService.searchJobs(dto);
  }

  @Get('semantic/people')
  @decorators.Public()
  @ApiOperation({
    summary: 'Semantic search for people',
    description:
      'Search for people/users using semantic similarity based on embeddings. Returns people ranked by semantic similarity to the query.',
  })
  @ApiResponse({
    status: 200,
    description: 'Semantic people search results',
  })
  async semanticSearchPeople(@Query() dto: SemanticSearchDto) {
    return this.semanticSearchService.searchPeople(dto);
  }
}
