import { Injectable } from '@nestjs/common';
import { JobSearchDto } from 'src/modules/jobs/api/dtos/search-job.dto';
import { JobStatus, JobType, JobSeniorityLevel, JobSource } from 'src/modules/jobs/domain/entities/job.entity';

@Injectable()
export class JobQueryBuilderService {
  buildSearchQuery(dto: JobSearchDto): any {
    const must: any[] = [];
    const should: any[] = [];
    const filter: any[] = [];

    // Status filter (default to ACTIVE)
    filter.push({
      term: {
        status: dto.status || JobStatus.ACTIVE,
      },
    });

    // Search term - multi-match across title, description, summary
    if (dto.searchTerm) {
      must.push({
        multi_match: {
          query: dto.searchTerm,
          fields: ['title^3', 'description^2', 'summary', 'company.name^2'],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      });
    }

    // Location filter
    if (dto.location) {
      filter.push({
        match: {
          'location.keyword': dto.location,
        },
      });
    }

    // Country filter
    if (dto.country) {
      filter.push({
        term: {
          countryCode: dto.country,
        },
      });
    }

    // Job type filter
    if (dto.type) {
      filter.push({
        term: {
          type: dto.type,
        },
      });
    }

    // Seniority level filter
    if (dto.seniorityLevel) {
      filter.push({
        term: {
          seniorityLevel: dto.seniorityLevel,
        },
      });
    }

    // Source filter
    if (dto.source) {
      filter.push({
        term: {
          source: dto.source,
        },
      });
    }

    // Organization filter
    if (dto.organizationId) {
      filter.push({
        term: {
          'company.id': dto.organizationId,
        },
      });
    }

    // Company name filter
    if (dto.companyName) {
      filter.push({
        match: {
          'company.name': dto.companyName,
        },
      });
    }

    // Keywords filter
    if (dto.keywords && dto.keywords.length > 0) {
      filter.push({
        terms: {
          keywords: dto.keywords,
        },
      });
    }

    // Salary range filter
    if (dto.minSalary || dto.maxSalary) {
      const range: any = {};
      if (dto.minSalary) range.gte = dto.minSalary;
      if (dto.maxSalary) range.lte = dto.maxSalary;

      filter.push({
        range: {
          'salary.min': range,
        },
      });
    }

    // Posted date filters
    if (dto.postedAfter || dto.postedBefore) {
      const dateRange: any = {};
      if (dto.postedAfter) dateRange.gte = dto.postedAfter;
      if (dto.postedBefore) dateRange.lte = dto.postedBefore;

      filter.push({
        range: {
          postedDate: dateRange,
        },
      });
    }

    const query: any = {
      bool: {},
    };

    if (must.length > 0) query.bool.must = must;
    if (should.length > 0) query.bool.should = should;
    if (filter.length > 0) query.bool.filter = filter;

    return query;
  }

  buildSortQuery(sortBy?: string, sortOrder: 'ASC' | 'DESC' = 'DESC'): any[] {
    const sort: any[] = [];

    if (sortBy === 'popularityScore') {
      sort.push({ popularityScore: { order: sortOrder.toLowerCase() } });
    } else if (sortBy === 'postedDate') {
      sort.push({ postedDate: { order: sortOrder.toLowerCase() } });
    } else if (sortBy === 'createdAt') {
      sort.push({ createdAt: { order: sortOrder.toLowerCase() } });
    } else {
      // Default: relevance score first, then by posted date
      sort.push({ _score: { order: 'desc' } });
      sort.push({ postedDate: { order: 'desc' } });
    }

    return sort;
  }
}

