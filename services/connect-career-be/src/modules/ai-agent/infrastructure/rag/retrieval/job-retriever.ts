import { Injectable } from '@nestjs/common';
import { HybridRetriever } from './hybrid-retriever';
import { JobStore } from '../stores/job.store';
import { DocumentChunk } from '../stores/base.store';

@Injectable()
export class JobRetriever {
  constructor(
    private readonly hybridRetriever: HybridRetriever,
    private readonly jobStore: JobStore,
  ) {}

  async retrieveJobs(
    query: string,
    options?: {
      limit?: number;
      filters?: {
        location?: string;
        salaryRange?: { min: number; max: number };
        skills?: string[];
        jobType?: string;
      };
    },
  ): Promise<DocumentChunk[]> {
    const limit = options?.limit || 10;
    const filter: Record<string, any> = {};

    if (options?.filters) {
      if (options.filters.location) {
        filter.location = options.filters.location;
      }
      if (options.filters.jobType) {
        filter.jobType = options.filters.jobType;
      }
      if (options.filters.skills) {
        filter.skills = options.filters.skills;
      }
    }

    return await this.hybridRetriever.retrieve(query, this.jobStore, limit, filter);
  }
}

