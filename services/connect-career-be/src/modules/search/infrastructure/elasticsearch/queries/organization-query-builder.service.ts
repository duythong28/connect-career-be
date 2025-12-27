import { Injectable } from '@nestjs/common';
import { OrganizationSearchDto } from 'src/modules/profile/api/dtos/organization-query.dto';

@Injectable()
export class OrganizationQueryBuilderService {
  buildSearchQuery(dto: OrganizationSearchDto): any {
    const must: any[] = [];
    const should: any[] = [];
    const filter: any[] = [];

    if (dto.search) {
      must.push({
        multi_match: {
          query: dto.search,
          fields: [
            'name^3',
            'tagline^2',
            'shortDescription',
            'longDescription',
          ],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      });
    }

    if (dto.industryIds && dto.industryIds.length > 0) {
      filter.push({
        terms: {
          'industry.id': dto.industryIds,
        },
      });
    }

    if (dto.country) {
      filter.push({
        term: {
          'location.country': dto.country,
        },
      });
    }

    if (dto.city) {
      filter.push({
        term: {
          'location.city': dto.city,
        },
      });
    }

    // Organization size filter
    if (dto.organizationSize && dto.organizationSize.length > 0) {
      filter.push({
        terms: {
          size: dto.organizationSize,
        },
      });
    }

    // Organization type filter
    if (dto.organizationType && dto.organizationType.length > 0) {
      filter.push({
        terms: {
          type: dto.organizationType,
        },
      });
    }

    // Employee count range
    if (dto.minEmployeeCount || dto.maxEmployeeCount) {
      const range: any = {};
      if (dto.minEmployeeCount) range.gte = dto.minEmployeeCount;
      if (dto.maxEmployeeCount) range.lte = dto.maxEmployeeCount;

      filter.push({
        range: {
          employeeCount: range,
        },
      });
    }

    // Work schedule types
    if (dto.workScheduleTypes && dto.workScheduleTypes.length > 0) {
      // Note: This would need to be added to the index mapping if not already present
      filter.push({
        terms: {
          workScheduleTypes: dto.workScheduleTypes,
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

    if (sortBy === 'relevance' || !sortBy) {
      sort.push({ _score: { order: 'desc' } });
    } else if (sortBy === 'name') {
      sort.push({ 'name.keyword': { order: sortOrder.toLowerCase() } });
    } else if (sortBy === 'activeJobsCount') {
      sort.push({ activeJobsCount: { order: sortOrder.toLowerCase() } });
    } else if (sortBy === 'createdAt') {
      sort.push({ createdAt: { order: sortOrder.toLowerCase() } });
    } else {
      sort.push({ _score: { order: 'desc' } });
    }

    return sort;
  }
}
