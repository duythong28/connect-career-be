import { Injectable, Logger } from '@nestjs/common';
import { LearningStore } from '../stores/learning.store';
import { DocumentChunk } from '../stores/base.store';

@Injectable()
export class LearningIngestionService {
  private readonly logger = new Logger(LearningIngestionService.name);

  constructor(private readonly learningStore: LearningStore) {}

  async ingestLearningResource(resource: {
    id: string;
    title: string;
    content: string;
    skill?: string;
    level?: 'beginner' | 'intermediate' | 'advanced';
    type?: 'course' | 'tutorial' | 'article' | 'video';
    url?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const chunks = await this.chunkLearningResource(resource);
      const chunksWithEmbeddings = await Promise.all(
        chunks.map(async (chunk) => ({
          ...chunk,
          embedding: await this.generateEmbedding(chunk.content),
        })),
      );

      await this.learningStore.addDocuments(chunksWithEmbeddings);
      this.logger.log(
        `Ingested learning resource ${resource.id} with ${chunks.length} chunks`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to ingest learning resource ${resource.id}: ${error}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  private async chunkLearningResource(resource: {
    id: string;
    title: string;
    content: string;
    skill?: string;
    level?: 'beginner' | 'intermediate' | 'advanced';
    type?: 'course' | 'tutorial' | 'article' | 'video';
    url?: string;
    metadata?: Record<string, any>;
  }): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    const chunkSize = 500;
    const overlap = 100;

    // Header chunk
    chunks.push({
      id: `${resource.id}_header`,
      content: `Title: ${resource.title}\n${resource.skill ? `Skill: ${resource.skill}\n` : ''}${resource.level ? `Level: ${resource.level}\n` : ''}${resource.type ? `Type: ${resource.type}` : ''}`,
      metadata: {
        source: resource.id,
        type: 'learning_header',
        title: resource.title,
        skill: resource.skill,
        level: resource.level,
        resourceType: resource.type,
        url: resource.url,
        ...resource.metadata,
      },
    });

    // Chunk content
    let start = 0;
    let chunkIndex = 1;
    while (start < resource.content.length) {
      const end = Math.min(start + chunkSize, resource.content.length);
      const chunkContent = resource.content.substring(start, end);

      chunks.push({
        id: `${resource.id}_chunk_${chunkIndex}`,
        content: chunkContent,
        metadata: {
          source: resource.id,
          type: 'learning_content',
          title: resource.title,
          skill: resource.skill,
          level: resource.level,
          chunkIndex,
          ...resource.metadata,
        },
      });

      start = end - overlap;
      chunkIndex++;
    }

    return chunks;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const dimensions = 768;
    const embedding = new Array(dimensions)
      .fill(0)
      .map(() => Math.random() - 0.5);
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map((val) => val / norm);
  }
}
