import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { JobContentEmbedding } from 'src/modules/recommendations/domain/entities/job-content-embedding.entity';
import { UserContentEmbedding } from 'src/modules/recommendations/domain/entities/user-content-embedding.entity';
import { Job } from 'src/modules/jobs/domain/entities/job.entity';
import { User } from 'src/modules/identity/domain/entities/user.entity';
import {
  SemanticSearchDto,
  SemanticJobSearchResult,
  SemanticPeopleSearchResult,
} from '../../api/dtos/semantic-search.dto';

@Injectable()
export class SemanticSearchService {
  private readonly logger = new Logger(SemanticSearchService.name);

  constructor(
    @InjectRepository(JobContentEmbedding)
    private readonly jobEmbeddingRepository: Repository<JobContentEmbedding>,
    @InjectRepository(UserContentEmbedding)
    private readonly userEmbeddingRepository: Repository<UserContentEmbedding>,
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate embedding for query text using AI service
   * Uses the /api/v1/embeddings/encode endpoint
   */
  private async generateQueryEmbedding(query: string): Promise<number[]> {
    try {
      const aiServiceUrl =
        this.configService.get<string>('AI_RECOMMENDER_URL') ||
        'http://ai-service:8000';

      const response = await firstValueFrom(
        this.httpService.post<{ embedding: number[] }>(
          `${aiServiceUrl}/api/v1/embeddings/encode`,
          { text: query },
          {
            timeout: 10000,
          },
        ),
      );

      return response.data.embedding;
    } catch (error) {
      this.logger.error('Failed to generate query embedding:', error);
      throw new Error(
        'Failed to generate query embedding. Please ensure AI service is running and has /api/v1/embeddings/encode endpoint.',
      );
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (!vec1 || !vec2 || vec1.length !== vec2.length) {
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

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    if (denominator === 0) {
      return 0;
    }

    return dotProduct / denominator;
  }

  /**
   * Search jobs using semantic similarity
   */
  async searchJobs(dto: SemanticSearchDto): Promise<{
    items: SemanticJobSearchResult[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      // Generate embedding for query
      const queryEmbedding = await this.generateQueryEmbedding(dto.q);

      // Fetch all job embeddings with their jobs
      const jobEmbeddings = await this.jobEmbeddingRepository.find({
        relations: ['job'],
      });

      // Calculate similarity scores
      const results: SemanticJobSearchResult[] = [];

      for (const jobEmbedding of jobEmbeddings) {
        if (!jobEmbedding.embedding || jobEmbedding.embedding.length === 0) {
          continue;
        }

        const similarity = this.cosineSimilarity(
          queryEmbedding,
          jobEmbedding.embedding,
        );

        if (similarity < (dto.minSimilarity || 0.5)) {
          continue;
        }

        results.push({
          id: jobEmbedding.jobId,
          title: jobEmbedding.job?.title || 'Unknown',
          similarity,
          job: jobEmbedding.job,
        });
      }

      // Sort by similarity (highest first)
      results.sort((a, b) => b.similarity - a.similarity);

      // Pagination
      const page = dto.page || 1;
      const limit = dto.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedResults = results.slice(startIndex, endIndex);

      return {
        items: paginatedResults,
        total: results.length,
        page,
        limit,
        totalPages: Math.ceil(results.length / limit),
      };
    } catch (error) {
      this.logger.error('Failed to perform semantic job search:', error);
      throw error;
    }
  }

  /**
   * Search people/users using semantic similarity
   */
  async searchPeople(dto: SemanticSearchDto): Promise<{
    items: SemanticPeopleSearchResult[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      // Generate embedding for query
      const queryEmbedding = await this.generateQueryEmbedding(dto.q);

      // Fetch all user embeddings with their users
      const userEmbeddings = await this.userEmbeddingRepository.find({
        relations: ['user'],
      });

      // Calculate similarity scores
      const results: SemanticPeopleSearchResult[] = [];

      for (const userEmbedding of userEmbeddings) {
        if (!userEmbedding.embedding || userEmbedding.embedding.length === 0) {
          continue;
        }

        const similarity = this.cosineSimilarity(
          queryEmbedding,
          userEmbedding.embedding,
        );

        if (similarity < (dto.minSimilarity || 0.5)) {
          continue;
        }

        const userName =
          userEmbedding.user?.firstName && userEmbedding.user?.lastName
            ? `${userEmbedding.user.firstName} ${userEmbedding.user.lastName}`
            : userEmbedding.user?.email || 'Unknown';

        results.push({
          id: userEmbedding.userId,
          name: userName,
          similarity,
          user: userEmbedding.user,
        });
      }

      // Sort by similarity (highest first)
      results.sort((a, b) => b.similarity - a.similarity);

      // Pagination
      const page = dto.page || 1;
      const limit = dto.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedResults = results.slice(startIndex, endIndex);

      return {
        items: paginatedResults,
        total: results.length,
        page,
        limit,
        totalPages: Math.ceil(results.length / limit),
      };
    } catch (error) {
      this.logger.error('Failed to perform semantic people search:', error);
      throw error;
    }
  }
}

