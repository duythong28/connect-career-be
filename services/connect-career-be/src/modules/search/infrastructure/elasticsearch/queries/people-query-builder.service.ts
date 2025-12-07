import { Injectable } from '@nestjs/common';

export interface PeopleSearchDto {
  searchTerm?: string;
  skills?: string[];
  location?: string;
  currentCompany?: string;
  experienceYears?: number;
  education?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

@Injectable()
export class PeopleQueryBuilderService {
  buildSearchQuery(dto: PeopleSearchDto): any {
    const must: any[] = [];
    const should: any[] = [];
    const filter: any[] = [];

    // Search term - multi-match across name, title, skills
    if (dto.searchTerm) {
      must.push({
        multi_match: {
          query: dto.searchTerm,
          fields: ['name^3', 'title^2', 'skills', 'currentCompany.name'],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      });
    }

    // Skills filter
    if (dto.skills && dto.skills.length > 0) {
      filter.push({
        terms: {
          skills: dto.skills,
        },
      });
    }

    // Location filter
    if (dto.location) {
      filter.push({
        match: {
          location: dto.location,
        },
      });
    }

    // Current company filter
    if (dto.currentCompany) {
      filter.push({
        match: {
          'currentCompany.name': dto.currentCompany,
        },
      });
    }

    // Experience filter (nested query)
    if (dto.experienceYears) {
      filter.push({
        nested: {
          path: 'experience',
          query: {
            range: {
              'experience.duration': {
                gte: dto.experienceYears * 12, // Convert years to months
              },
            },
          },
        },
      });
    }

    // Education filter (nested query)
    if (dto.education) {
      filter.push({
        nested: {
          path: 'education',
          query: {
            match: {
              'education.degree': dto.education,
            },
          },
        },
      });
    }

    const query: {
      bool: {
        must?: any[];
        should?: any[];
        filter?: any[];
      };
    } = {
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
    } else if (sortBy === 'createdAt') {
      sort.push({ createdAt: { order: sortOrder.toLowerCase() } });
    } else {
      sort.push({ _score: { order: 'desc' } });
    }

    return sort;
  }
}

