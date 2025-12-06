import { Injectable } from '@nestjs/common';
import { HybridRetriever } from './hybrid-retriever';
import { LearningStore } from '../stores/learning.store';
import { DocumentChunk } from '../stores/base.store';

@Injectable()
export class LearningRetriever {
  constructor(
    private readonly hybridRetriever: HybridRetriever,
    private readonly learningStore: LearningStore,
  ) {}

  async retrieveLearningResources(
    query: string,
    options?: {
      limit?: number;
      filters?: {
        skill?: string;
        level?: 'beginner' | 'intermediate' | 'advanced';
        type?: 'course' | 'tutorial' | 'article' | 'video';
      };
    },
  ): Promise<DocumentChunk[]> {
    const limit = options?.limit || 10;
    const filter: Record<string, any> = {};

    if (options?.filters) {
      if (options.filters.skill) {
        filter.skill = options.filters.skill;
      }
      if (options.filters.level) {
        filter.level = options.filters.level;
      }
      if (options.filters.type) {
        filter.type = options.filters.type;
      }
    }

    return await this.hybridRetriever.retrieve(
      query,
      this.learningStore,
      limit,
      filter,
    );
  }
}
