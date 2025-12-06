import { Injectable } from '@nestjs/common';
import { HybridRetriever } from './hybrid-retriever';
import { FaqStore } from '../stores/faq.store';
import { DocumentChunk } from '../stores/base.store';

@Injectable()
export class FaqRetriever {
  constructor(
    private readonly hybridRetriever: HybridRetriever,
    private readonly faqStore: FaqStore,
  ) {}

  async retrieveFaqs(
    query: string,
    options?: {
      limit?: number;
      filters?: {
        category?: string;
        tags?: string[];
      };
    },
  ): Promise<DocumentChunk[]> {
    const limit = options?.limit || 10;
    const filter: Record<string, any> = {};

    if (options?.filters) {
      if (options.filters.category) {
        filter.category = options.filters.category;
      }
      if (options.filters.tags) {
        filter.tags = options.filters.tags;
      }
    }

    return await this.hybridRetriever.retrieve(
      query,
      this.faqStore,
      limit,
      filter,
    );
  }
}
