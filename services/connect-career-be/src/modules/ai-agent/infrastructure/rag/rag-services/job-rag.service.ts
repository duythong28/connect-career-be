import { Injectable, Logger } from '@nestjs/common';
import { JobRetriever } from '../retrieval/job-retriever';
import { QueryRewriterService } from '../query/rewriter.service';
import { QueryExpanderService } from '../query/expander.service';
import { QueryNormalizerService } from '../query/normalizer.service';
import { CrossEncoderRanker } from '../ranking/cross-encoder-ranker';
import { ScoreFusionService } from '../ranking/score-fusion';
import { DocumentChunk } from '../stores/base.store';

@Injectable()
export class JobRagService {
  private readonly logger = new Logger(JobRagService.name);

  constructor(
    private readonly jobRetriever: JobRetriever,
    private readonly queryRewriter: QueryRewriterService,
    private readonly queryExpander: QueryExpanderService,
    private readonly queryNormalizer: QueryNormalizerService,
    private readonly crossEncoderRanker: CrossEncoderRanker,
    private readonly scoreFusion: ScoreFusionService,
  ) {}

  async retrieve(
    query: string,
    options?: {
      limit?: number;
      filters?: {
        location?: string;
        salaryRange?: { min: number; max: number };
        skills?: string[];
        jobType?: string;
      };
      context?: {
        conversationHistory?: Array<{ role: string; content: string }>;
      };
    },
  ): Promise<DocumentChunk[]> {
    try {
      // Normalize query
      const normalizedQuery = this.queryNormalizer.normalizeQuery(query);

      // Rewrite query for better retrieval
      const rewrittenQuery = await this.queryRewriter.rewriteQuery(normalizedQuery, {
        conversationHistory: options?.context?.conversationHistory,
        domain: 'job',
      });

      // Expand query for better coverage
      const expandedQueries = await this.queryExpander.expandQuery(rewrittenQuery, {
        maxExpansions: 2,
        domain: 'job',
      });

      // Retrieve from all query variations
      const allResults: DocumentChunk[] = [];
      const uniqueIds = new Set<string>();

      // Retrieve with rewritten query
      const rewrittenResults = await this.jobRetriever.retrieveJobs(rewrittenQuery, {
        limit: options?.limit || 10,
        filters: options?.filters,
      });

      for (const result of rewrittenResults) {
        if (!uniqueIds.has(result.id)) {
          uniqueIds.add(result.id);
          allResults.push(result);
        }
      }

      // Retrieve with expanded queries
      for (const expandedQuery of expandedQueries) {
        const expandedResults = await this.jobRetriever.retrieveJobs(expandedQuery, {
          limit: 5,
          filters: options?.filters,
        });

        for (const result of expandedResults) {
          if (!uniqueIds.has(result.id)) {
            uniqueIds.add(result.id);
            allResults.push(result);
          }
        }
      }

      // Re-rank with cross-encoder
      const reranked = await this.crossEncoderRanker.rerank(
        rewrittenQuery,
        allResults,
        (options?.limit || 10) * 2,
      );

      // Fuse scores
      const fused = this.scoreFusion.fuseScores(reranked);

      return fused.slice(0, options?.limit || 10);
    } catch (error) {
      this.logger.error(`Job RAG retrieval failed: ${error}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }
}

