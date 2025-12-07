import { Injectable } from '@nestjs/common';
import { HybridRetriever } from './hybrid-retriever';
import { CompanyStore } from '../stores/company.store';
import { DocumentChunk } from '../stores/base.store';

@Injectable()
export class CompanyRetriever {
  constructor(
    private readonly hybridRetriever: HybridRetriever,
    private readonly companyStore: CompanyStore,
  ) {}

  async retrieveCompanies(
    query: string,
    options?: {
      limit?: number;
      filters?: {
        industry?: string;
        size?: string;
        location?: string;
      };
    },
  ): Promise<DocumentChunk[]> {
    const limit = options?.limit || 10;
    const filter: Record<string, any> = {};

    if (options?.filters) {
      if (options.filters.industry) {
        filter.industry = options.filters.industry;
      }
      if (options.filters.size) {
        filter.size = options.filters.size;
      }
      if (options.filters.location) {
        filter.location = options.filters.location;
      }
    }

    return await this.hybridRetriever.retrieve(
      query,
      this.companyStore,
      limit,
      filter,
    );
  }
}
