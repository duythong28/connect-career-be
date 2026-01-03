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
      const limit = Math.min(options?.limit || 10, 10); // Hard limit to 10

      // Normalize query
      const normalizedQuery = this.queryNormalizer.normalizeQuery(query);
      console.log('normalizedQuery', normalizedQuery);

      // Rewrite query for better retrieval
      const rewrittenQuery = await this.queryRewriter.rewriteQuery(
        normalizedQuery,
        {
          conversationHistory: options?.context?.conversationHistory,
          domain: 'job',
        },
      );
      console.log('rewrittenQuery', rewrittenQuery);

      // SKIP query expansion to save 1 AI call
      // const expandedQueries = await this.queryExpander.expandQuery(...);

      // Retrieve from rewritten query only
      const allResults: DocumentChunk[] = [];
      const uniqueIds = new Set<string>();

      // Retrieve with rewritten query - get more than needed for reranking
      const rewrittenResults = await this.jobRetriever.retrieveJobs(
        rewrittenQuery,
        {
          limit: limit * 2, // Get 20 for reranking, then limit to 10
          filters: options?.filters,
        },
      );
      console.log('rewrittenResults', JSON.stringify(rewrittenResults));

      for (const result of rewrittenResults) {
        if (!uniqueIds.has(result.id)) {
          uniqueIds.add(result.id);
          allResults.push(result);
        }
      }

      // SKIP expanded queries to save retrieval time
      // for (const expandedQuery of expandedQueries) { ... }

      // Re-rank with cross-encoder - but limit to top 15 to save AI calls
      const maxRerank = Math.min(allResults.length, 15); // Only rerank top 15
      const resultsToRerank = allResults.slice(0, maxRerank);

      const reranked = await this.crossEncoderRanker.rerank(
        rewrittenQuery,
        resultsToRerank,
        limit,
      );

      // Add remaining results that weren't reranked (with original scores)
      const remaining = allResults.slice(maxRerank);
      const finalResults = [
        ...reranked,
        ...remaining.slice(0, limit - reranked.length),
      ];

      // Fuse scores
      const fused = this.scoreFusion.fuseScores(finalResults);

      // Return exactly 10 jobs
      return fused.slice(0, limit);
    } catch (error) {
      this.logger.error(
        `Job RAG retrieval failed: ${error}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
