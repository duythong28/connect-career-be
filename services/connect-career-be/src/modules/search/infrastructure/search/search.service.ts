import { Injectable, Logger, Inject } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { JobSearchDto } from 'src/modules/jobs/api/dtos/search-job.dto';
import { OrganizationSearchDto } from 'src/modules/profile/api/dtos/organization-query.dto';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';
import { JobQueryBuilderService } from '../elasticsearch/queries/job-query-builder.service';
import { OrganizationQueryBuilderService } from '../elasticsearch/queries/organization-query-builder.service';
import { PeopleQueryBuilderService, PeopleSearchDto } from '../elasticsearch/queries/people-query-builder.service';
import { GlobalSearchDto, SearchType } from '../../api/dtos/global-search.dto';
import { AutocompleteDto, AutocompleteType } from '../../api/dtos/autocomplete.dto';

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GlobalSearchResult {
  jobs?: SearchResult<any>;
  organizations?: SearchResult<any>;
  people?: SearchResult<any>;
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @Inject('ELASTICSEARCH_CLIENT')
    private readonly client: Client,
    private readonly elasticsearchService: ElasticsearchService,
    private readonly jobQueryBuilder: JobQueryBuilderService,
    private readonly organizationQueryBuilder: OrganizationQueryBuilderService,
    private readonly peopleQueryBuilder: PeopleQueryBuilderService,
  ) {}

  async searchJobs(dto: JobSearchDto): Promise<SearchResult<any>> {
    try {
      const query = this.jobQueryBuilder.buildSearchQuery(dto);
      const sort = this.jobQueryBuilder.buildSortQuery(dto.sortBy, dto.sortOrder);

      const page = dto.pageNumber || 1;
      const size = dto.pageSize || 10;
      const from = (page - 1) * size;

      const response = await this.client.search({
        index: this.elasticsearchService.getJobIndex(),
        query,
        sort,
        from,
        size,
      });

      const total = typeof response.hits.total === 'number' 
        ? response.hits.total 
        : response.hits.total?.value || 0;

      return {
        items: response.hits.hits.map((hit: any) => ({
          ...hit._source,
          _score: hit._score,
        })),
        total,
        page,
        limit: size,
        totalPages: Math.ceil(total / size),
      };
    } catch (error) {
      this.logger.error('Failed to search jobs:', error);
      throw error;
    }
  }

  async searchOrganizations(dto: OrganizationSearchDto): Promise<SearchResult<any>> {
    try {
      const query = this.organizationQueryBuilder.buildSearchQuery(dto);
      const sort = this.organizationQueryBuilder.buildSortQuery(dto.sortBy, dto.sortOrder);

      const page = dto.page || 1;
      const size = dto.limit || 20;
      const from = (page - 1) * size;

      const response = await this.client.search({
        index: this.elasticsearchService.getOrganizationIndex(),
        query,
        sort,
        from,
        size,
      });

      const total = typeof response.hits.total === 'number' 
        ? response.hits.total 
        : response.hits.total?.value || 0;

      return {
        items: response.hits.hits.map((hit: any) => ({
          ...hit._source,
          _score: hit._score,
        })),
        total,
        page,
        limit: size,
        totalPages: Math.ceil(total / size),
      };
    } catch (error) {
      this.logger.error('Failed to search organizations:', error);
      throw error;
    }
  }

  async searchPeople(dto: PeopleSearchDto): Promise<SearchResult<any>> {
    try {
      const query = this.peopleQueryBuilder.buildSearchQuery(dto);
      const sort = this.peopleQueryBuilder.buildSortQuery(dto.sortBy, dto.sortOrder);

      const page = dto.page || 1;
      const size = dto.limit || 20;
      const from = (page - 1) * size;

      const response = await this.client.search({
        index: this.elasticsearchService.getPeopleIndex(),
        query,
        sort,
        from,
        size,
      });

      const total = typeof response.hits.total === 'number' 
        ? response.hits.total 
        : response.hits.total?.value || 0;

      return {
        items: response.hits.hits.map((hit: any) => ({
          ...hit._source,
          _score: hit._score,
        })),
        total,
        page,
        limit: size,
        totalPages: Math.ceil(total / size),
      };
    } catch (error) {
      this.logger.error('Failed to search people:', error);
      throw error;
    }
  }

  async globalSearch(dto: GlobalSearchDto): Promise<GlobalSearchResult> {
    try {
      const { q, type, page = 1, limit = 20, sortBy, sortOrder } = dto;
      const resultsPerType = Math.ceil(limit / 3); // Distribute results across types

      const searchPromises: Promise<any>[] = [];
      const result: GlobalSearchResult = {
        total: 0,
        page,
        limit,
      };

      // Search jobs
      if (type === SearchType.ALL || type === SearchType.JOBS) {
        const jobDto: Partial<JobSearchDto> = {
          searchTerm: q,
          pageNumber: 1,
          pageSize: resultsPerType,
          sortBy,
          sortOrder,
        };
        searchPromises.push(
          this.searchJobs(jobDto as JobSearchDto).then((r) => {
            result.jobs = r;
            return r;
          }),
        );
      }

      // Search organizations
      if (type === SearchType.ALL || type === SearchType.ORGANIZATIONS) {
        const orgDto: OrganizationSearchDto = {
          search: q,
          page: 1,
          limit: resultsPerType,
          sortBy,
          sortOrder,
        };
        searchPromises.push(
          this.searchOrganizations(orgDto).then((r) => {
            result.organizations = r;
            return r;
          }),
        );
      }

      // Search people
      if (type === SearchType.ALL || type === SearchType.PEOPLE) {
        const peopleDto: PeopleSearchDto = {
          searchTerm: q,
          page: 1,
          limit: resultsPerType,
          sortBy,
          sortOrder,
        };
        searchPromises.push(
          this.searchPeople(peopleDto).then((r) => {
            result.people = r;
            return r;
          }),
        );
      }

      // Execute all searches in parallel
      await Promise.all(searchPromises);

      // Calculate total
      result.total =
        (result.jobs?.total || 0) +
        (result.organizations?.total || 0) +
        (result.people?.total || 0);

      return result;
    } catch (error) {
      this.logger.error('Failed to perform global search:', error);
      throw error;
    }
  }

  async autocomplete(dto: AutocompleteDto): Promise<{
    suggestions: Array<{
      text: string;
      type: 'job' | 'organization';
      id?: string;
      score?: number;
    }>;
  }> {
    try {
      const { q, type = AutocompleteType.ALL, size = 10 } = dto;
      const suggestions: Array<{
        text: string;
        type: 'job' | 'organization';
        id?: string;
        score?: number;
      }> = [];

      const perTypeSize = Math.ceil(size / 2);

      // Autocomplete jobs
      if (type === AutocompleteType.ALL || type === AutocompleteType.JOBS) {
        try {
          const jobSuggestResponse = await this.client.search({
            index: this.elasticsearchService.getJobIndex(),
            suggest: {
              job_suggest: {
                prefix: q,
                completion: {
                  field: 'title.suggest',
                  size: perTypeSize,
                  skip_duplicates: true,
                },
              },
            },
          });

          const jobSuggestOptions = jobSuggestResponse.suggest?.job_suggest?.[0]?.options;
          if (Array.isArray(jobSuggestOptions)) {
            suggestions.push(
              ...jobSuggestOptions.map((option: any) => ({
                text: option.text || option._source?.title || '',
                type: 'job' as const,
                id: option._source?.id,
                score: option.score,
              })),
            );
          }
        } catch (error) {
          this.logger.warn('Failed to get job suggestions:', error);
        }
      }

      // Autocomplete organizations
      if (type === AutocompleteType.ALL || type === AutocompleteType.ORGANIZATIONS) {
        try {
          const orgSuggestResponse = await this.client.search({
            index: this.elasticsearchService.getOrganizationIndex(),
            suggest: {
              org_suggest: {
                prefix: q,
                completion: {
                  field: 'name.suggest',
                  size: perTypeSize,
                  skip_duplicates: true,
                },
              },
            },
          });

          const orgSuggestOptions = orgSuggestResponse.suggest?.org_suggest?.[0]?.options;
          if (Array.isArray(orgSuggestOptions)) {
            suggestions.push(
              ...orgSuggestOptions.map((option: any) => ({
                text: option.text || option._source?.name || '',
                type: 'organization' as const,
                id: option._source?.id,
                score: option.score,
              })),
            );
          }
        } catch (error) {
          this.logger.warn('Failed to get organization suggestions:', error);
        }
      }

      // Sort by score and limit to requested size
      suggestions.sort((a, b) => (b.score || 0) - (a.score || 0));
      return {
        suggestions: suggestions.slice(0, size),
      };
    } catch (error) {
      this.logger.error('Failed to get autocomplete suggestions:', error);
      throw error;
    }
  }
}

