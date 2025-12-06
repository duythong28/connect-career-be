import { Injectable, Logger } from '@nestjs/common';
import { VectorStore, DocumentChunk } from './base.store';

@Injectable()
export class LearningStore implements VectorStore {
  private readonly logger = new Logger(LearningStore.name);
  private readonly documents = new Map<string, DocumentChunk>();

  async addDocuments(chunks: DocumentChunk[]): Promise<void> {
    for (const chunk of chunks) {
      this.documents.set(chunk.id, chunk);
    }
    this.logger.log(`Added ${chunks.length} learning documents to store`);
  }

  async similaritySearch(
    queryEmbedding: number[],
    limit: number,
    filter?: Record<string, any>,
  ): Promise<DocumentChunk[]> {
    const results: DocumentChunk[] = [];

    for (const chunk of this.documents.values()) {
      if (!chunk.embedding) {
        continue;
      }

      if (filter) {
        const matches = Object.entries(filter).every(([key, value]) => {
          return chunk.metadata[key] === value;
        });
        if (!matches) {
          continue;
        }
      }

      const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);
      results.push({ ...chunk, score: similarity });
    }

    return results
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, limit);
  }

  async deleteDocuments(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.documents.delete(id);
    }
    this.logger.log(`Deleted ${ids.length} documents from learning store`);
  }

  async updateDocument(id: string, chunk: Partial<DocumentChunk>): Promise<void> {
    const existing = this.documents.get(id);
    if (existing) {
      this.documents.set(id, { ...existing, ...chunk });
    }
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      return 0;
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }
}

