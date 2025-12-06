import { Injectable, Logger } from '@nestjs/common';
import { SemanticMemory } from '../../domain/interfaces/memory.interface';

interface Concept {
  concept: string;
  embedding: number[];
  metadata?: Record<string, any>;
  timestamp: Date;
}

@Injectable()
export class SemanticMemoryService implements SemanticMemory {
  private readonly logger = new Logger(SemanticMemoryService.name);
  private readonly concepts = new Map<string, Concept>();

  async store(
    key: string,
    value: any,
    metadata?: Record<string, any>,
  ): Promise<void> {
    // Store semantic memory entry
    this.concepts.set(key, {
      concept: typeof value === 'string' ? value : JSON.stringify(value),
      embedding: [], // Placeholder - in production, generate embeddings
      metadata,
      timestamp: new Date(),
    });
  }

  async retrieve(key: string): Promise<any | null> {
    const concept = this.concepts.get(key);
    return concept ? concept.concept : null;
  }

  async search(
    query: string,
    limit: number = 10,
  ): Promise<Array<{ key: string; value: any; score: number }>> {
    // Simple text-based search (in production, use vector similarity search)
    const results: Array<{ key: string; value: any; score: number }> = [];
    const queryLower = query.toLowerCase();

    for (const [key, concept] of this.concepts.entries()) {
      const conceptLower = concept.concept.toLowerCase();
      if (conceptLower.includes(queryLower)) {
        // Simple similarity score
        const score = this.calculateSimilarity(queryLower, conceptLower);
        results.push({
          key,
          value: concept.concept,
          score,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  async delete(key: string): Promise<void> {
    this.concepts.delete(key);
  }

  async storeConcept(
    concept: string,
    embedding: number[],
    metadata?: Record<string, any>,
  ): Promise<void> {
    const key = `concept_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.concepts.set(key, {
      concept,
      embedding,
      metadata,
      timestamp: new Date(),
    });
  }

  async findSimilar(
    embedding: number[],
    limit: number = 10,
  ): Promise<Array<{ concept: string; score: number }>> {
    // Placeholder for vector similarity search
    // In production, use a vector database like Pinecone, Weaviate, or Qdrant
    const results: Array<{ concept: string; score: number }> = [];

    for (const concept of this.concepts.values()) {
      if (concept.embedding.length > 0) {
        const similarity = this.cosineSimilarity(embedding, concept.embedding);
        results.push({
          concept: concept.concept,
          score: similarity,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple Jaccard similarity
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    return intersection.size / union.size;
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
