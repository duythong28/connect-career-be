import { Injectable, Logger } from '@nestjs/common';
import { JobStore } from '../stores/job.store';
import { DocumentChunk } from '../stores/base.store';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';

@Injectable()
export class JobIngestionService {
  private readonly logger = new Logger(JobIngestionService.name);

  constructor(
    private readonly jobStore: JobStore,
    private readonly aiService: AIService,
  ) {}

  async ingestJob(job: {
    id: string;
    title: string;
    description: string;
    company: string;
    location?: string;
    skills?: string[];
    salaryRange?: { min: number; max: number };
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      // Chunk the job description
      const chunks = await this.chunkJob(job);

      // Generate embeddings for each chunk
      const chunksWithEmbeddings = await Promise.all(
        chunks.map(async (chunk) => ({
          ...chunk,
          embedding: await this.generateEmbedding(chunk.content),
        })),
      );

      // Store in vector store
      await this.jobStore.addDocuments(chunksWithEmbeddings);

      this.logger.log(`Ingested job ${job.id} with ${chunks.length} chunks`);
    } catch (error) {
      this.logger.error(`Failed to ingest job ${job.id}: ${error}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  private async chunkJob(job: {
    id: string;
    title: string;
    description: string;
    company: string;
    location?: string;
    skills?: string[];
    salaryRange?: { min: number; max: number };
    metadata?: Record<string, any>;
  }): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    const chunkSize = 500; // characters per chunk
    const overlap = 100; // overlap between chunks

    // Chunk 1: Title and basic info
    chunks.push({
      id: `${job.id}_chunk_0`,
      content: `Job Title: ${job.title}\nCompany: ${job.company}${job.location ? `\nLocation: ${job.location}` : ''}${job.skills ? `\nRequired Skills: ${job.skills.join(', ')}` : ''}`,
      metadata: {
        source: job.id,
        type: 'job_header',
        company: job.company,
        location: job.location,
        skills: job.skills,
        ...job.metadata,
      },
    });

    // Chunk description
    const description = job.description;
    let start = 0;
    let chunkIndex = 1;

    while (start < description.length) {
      const end = Math.min(start + chunkSize, description.length);
      const chunkContent = description.substring(start, end);

      chunks.push({
        id: `${job.id}_chunk_${chunkIndex}`,
        content: chunkContent,
        metadata: {
          source: job.id,
          type: 'job_description',
          company: job.company,
          chunkIndex,
          ...job.metadata,
        },
      });

      start = end - overlap;
      chunkIndex++;
    }

    return chunks;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Placeholder - integrate with actual embedding service
    const dimensions = 768;
    const embedding = new Array(dimensions).fill(0).map(() => Math.random() - 0.5);
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / norm);
  }
}

