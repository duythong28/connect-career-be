import { Injectable, Logger } from '@nestjs/common';
import { VectorRetriever } from './vector-retriever';
import { VectorStore, DocumentChunk } from '../stores/base.store';

@Injectable()
export class HybridRetriever {
  private readonly logger = new Logger(HybridRetriever.name);

  constructor(private readonly vectorRetriever: VectorRetriever) {}

  async retrieve(
    query: string,
    store: VectorStore,
    limit: number = 10,
    filter?: Record<string, any>,
    options?: {
      vectorWeight?: number;
      keywordWeight?: number;
    },
  ): Promise<DocumentChunk[]> {
    const vectorWeight = options?.vectorWeight ?? 0.7;
    const keywordWeight = options?.keywordWeight ?? 0.3;

    try {
      // Vector search
      const vectorResults = await this.vectorRetriever.retrieve(query, store, limit * 2, filter);

      // Keyword search (simple text matching)
      const keywordResults = await this.keywordSearch(query, store, limit * 2, filter);

      // Combine and re-rank
      const combined = this.combineResults(vectorResults, keywordResults, vectorWeight, keywordWeight);

      return combined.slice(0, limit);
    } catch (error) {
      this.logger.error(`Hybrid retrieval failed: ${error}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  private async keywordSearch(
    query: string,
    store: VectorStore,
    limit: number,
    filter?: Record<string, any>,
  ): Promise<DocumentChunk[]> {
    // Simple keyword matching (in production, use Elasticsearch or similar)
    // For now, this is a placeholder that would need access to document content
    // The actual implementation would search through document text
    return [];
  }

  private combineResults(
    vectorResults: DocumentChunk[],
    keywordResults: DocumentChunk[],
    vectorWeight: number,
    keywordWeight: number,
  ): DocumentChunk[] {
    const combined = new Map<string, DocumentChunk>();

    // Add vector results
    vectorResults.forEach((chunk, index) => {
      const score = (chunk.score || 0) * vectorWeight * (1 - index / vectorResults.length);
      combined.set(chunk.id, { ...chunk, score });
    });

    // Add keyword results
    keywordResults.forEach((chunk, index) => {
      const existing = combined.get(chunk.id);
      if (existing) {
        // Boost score if found in both
        existing.score = (existing.score || 0) + keywordWeight * (1 - index / keywordResults.length);
      } else {
        const score = keywordWeight * (1 - index / keywordResults.length);
        combined.set(chunk.id, { ...chunk, score });
      }
    });

    return Array.from(combined.values())
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  }
}

