import { Injectable, Logger } from '@nestjs/common';
import { VectorStore, DocumentChunk } from '../stores/base.store';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';
import { AIVectorizeResponse } from 'src/shared/infrastructure/external-services/ai/domain/ai-provider.interface';

@Injectable()
export class VectorRetriever {
  private readonly logger = new Logger(VectorRetriever.name);

  constructor(private readonly aiService: AIService) {}

  async retrieve(
    query: string,
    store: VectorStore,
    limit: number = 10,
    filter?: Record<string, any>,
  ): Promise<DocumentChunk[]> {
    try {
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(query);

      // Search in vector store
      const results = await store.similaritySearch(
        queryEmbedding,
        limit,
        filter,
      );

      return results;
    } catch (error) {
      this.logger.error(
        `Vector retrieval failed: ${error}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Use real embedding service
      let response: AIVectorizeResponse | null = null;
      try {
        response = await this.aiService.embed({ text });
      } catch (err) {
        this.logger.warn(
          `Embedding service call failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        return this.generateFallbackEmbedding(text);
      }

      // Type guard to ensure response is valid
      if (!response || typeof response !== 'object') {
        this.logger.warn(
          'Invalid response from embedding service, using fallback',
        );
        return this.generateFallbackEmbedding(text);
      }

      const vector = response.vector;
      if (!vector || !Array.isArray(vector) || vector.length === 0) {
        this.logger.warn('Empty embedding returned, using fallback');
        return this.generateFallbackEmbedding(text);
      }

      // Ensure all values are numbers
      const numericVector = vector.filter(
        (val): val is number => typeof val === 'number' && !isNaN(val),
      );

      if (numericVector.length === 0) {
        this.logger.warn(
          'No valid numeric values in embedding, using fallback',
        );
        return this.generateFallbackEmbedding(text);
      }

      this.logger.debug(
        `Generated embedding with ${numericVector.length} dimensions`,
      );
      return numericVector;
    } catch (error) {
      this.logger.error(
        `Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}. Using fallback.`,
      );
      // Fallback to placeholder embedding if service fails
      return this.generateFallbackEmbedding(text);
    }
  }

  private generateFallbackEmbedding(text: string): number[] {
    // Fallback: Generate a simple hash-based embedding
    // This is better than random but still not ideal
    this.logger.warn('Using fallback embedding generation');

    const dimensions = 768;
    const embedding = new Array(dimensions).fill(0);

    // Simple hash-based approach for consistency
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Use hash to seed pseudo-random values
    const seed = Math.abs(hash);
    for (let i = 0; i < dimensions; i++) {
      // Simple seeded random
      const x = Math.sin((seed + i) * 12.9898) * 43758.5453;
      embedding[i] = x - Math.floor(x) - 0.5;
    }

    // Normalize
    const norm = Math.sqrt(
      embedding.reduce((sum: number, val: number) => sum + val * val, 0),
    );
    return embedding.map((val: number) => (norm > 0 ? val / norm : 0));
  }
}
