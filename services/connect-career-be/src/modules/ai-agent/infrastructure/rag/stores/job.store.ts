import { Injectable, Logger } from '@nestjs/common';
import { VectorStore, DocumentChunk } from './base.store';
import { InjectRepository } from '@nestjs/typeorm';
import { Job, JobStatus } from 'src/modules/jobs/domain/entities/job.entity';
import { Repository } from 'typeorm';
import { JobContentEmbedding } from 'src/modules/recommendations/domain/entities/job-content-embedding.entity';

@Injectable()
export class JobStore implements VectorStore {
  private readonly logger = new Logger(JobStore.name);
  private readonly documents = new Map<string, DocumentChunk>();

  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(JobContentEmbedding)
    private readonly embeddingRepository: Repository<JobContentEmbedding>,
  ) {}

  async addDocuments(chunks: DocumentChunk[]): Promise<void> {
    for (const chunk of chunks) {
      this.documents.set(chunk.id, chunk);
    }
    this.logger.log(`Added ${chunks.length} job documents to store`);
  }

  async similaritySearch(
    queryEmbedding: number[],
    limit: number,
    filter?: Record<string, any>,
  ): Promise<DocumentChunk[]> {
    return await this.searchFromDatabase(queryEmbedding, limit, filter);
  }

  /**
   * Fallback: Query database directly when in-memory store is empty
   */
  private async searchFromDatabase(
    queryEmbedding: number[],
    limit: number,
    filter?: Record<string, any>,
  ): Promise<DocumentChunk[]> {
    try {
      // Build query with JOIN to job_content_embeddings
      const queryBuilder = this.jobRepository
        .createQueryBuilder('job')
        .innerJoin(
          'job_content_embeddings',
          'embedding',
          'embedding."jobId" = job.id',
        )
        .where('job.status = :status', { status: JobStatus.ACTIVE })
        .andWhere('job.deletedAt IS NULL')
        .andWhere('embedding.embedding IS NOT NULL'); // Only jobs with embeddings

      // Apply filters
      if (filter?.location) {
        queryBuilder.andWhere('job.location ILIKE :location', {
          location: `%${filter.location}%`,
        });
      }

      if (filter?.jobType) {
        queryBuilder.andWhere('job.type = :jobType', {
          jobType: filter.jobType as string,
        });
      }

      // Get more jobs to calculate similarity, then filter
      const maxJobs = Math.min(limit * 5, 100); // Get up to 100 jobs for better results
      const jobsWithEmbeddings = await queryBuilder
        .select([
          'job.id',
          'job.title',
          'job.description',
          'job.summary',
          'job.location',
          'job.countryCode',
          'job.type',
          'job.seniorityLevel',
          'job.source',
          'job.organizationId',
          'job.companyName',
          'embedding.embedding',
        ])
        .limit(maxJobs)
        .getRawMany();

      if (jobsWithEmbeddings.length === 0) {
        this.logger.warn('No jobs found with embeddings in database');
        return [];
      }

      // Calculate similarity scores using stored embeddings
      const chunks: any[] = jobsWithEmbeddings
        .map((row) => {
          const embedding = row.embedding_embedding;

          if (!embedding || !Array.isArray(embedding)) {
            return null;
          }

          const content =
            `${row.job_title} ${row.job_description || ''} ${row.job_summary || ''} ${row.job_companyName || ''}`.trim();

          // Calculate cosine similarity
          const similarity = this.cosineSimilarity(queryEmbedding, embedding);

          return {
            id: row.job_id,
            content,
            metadata: {
              title: row.job_title,
              company: row.job_companyName,
              location: row.job_location,
              country: row.job_countryCode,
              type: row.job_type,
              seniorityLevel: row.job_seniorityLevel,
              source: row.job_source,
              organizationId: row.job_organizationId,
            },
            embedding,
            score: similarity,
          };
        })
        .filter((chunk: any) => chunk !== null)
        .sort((a, b) => (b?.score || 0) - (a?.score || 0))
        .slice(0, limit);

      this.logger.debug(`Found ${chunks.length} jobs using stored embeddings`);
      return chunks;
    } catch (error) {
      this.logger.error(`Database search with embeddings failed: ${error}`);
      return [];
    }
  }

  async deleteDocuments(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.documents.delete(id);
    }
    this.logger.log(`Deleted ${ids.length} documents from job store`);
  }

  async updateDocument(
    id: string,
    chunk: Partial<DocumentChunk>,
  ): Promise<void> {
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
