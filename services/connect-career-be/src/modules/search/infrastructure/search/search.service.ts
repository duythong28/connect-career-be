import { Injectable, Logger, Inject } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { JobSearchDto } from 'src/modules/jobs/api/dtos/search-job.dto';
import { OrganizationSearchDto } from 'src/modules/profile/api/dtos/organization-query.dto';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';
import { JobQueryBuilderService } from '../elasticsearch/queries/job-query-builder.service';
import { OrganizationQueryBuilderService } from '../elasticsearch/queries/organization-query-builder.service';
import { PeopleQueryBuilderService, PeopleSearchDto } from '../elasticsearch/queries/people-query-builder.service';

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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
}

