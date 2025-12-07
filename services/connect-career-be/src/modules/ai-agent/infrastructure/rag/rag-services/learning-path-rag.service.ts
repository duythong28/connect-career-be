import { Injectable, Logger } from '@nestjs/common';
import { LearningRetriever } from '../retrieval/learning-retriever';
import { QueryRewriterService } from '../query/rewriter.service';
import { QueryExpanderService } from '../query/expander.service';
import { QueryNormalizerService } from '../query/normalizer.service';
import { CrossEncoderRanker } from '../ranking/cross-encoder-ranker';
import { ScoreFusionService } from '../ranking/score-fusion';
import { DocumentChunk } from '../stores/base.store';

@Injectable()
export class LearningPathRagService {
  private readonly logger = new Logger(LearningPathRagService.name);

  constructor(
    private readonly learningRetriever: LearningRetriever,
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
        skill?: string;
        level?: 'beginner' | 'intermediate' | 'advanced';
        type?: 'course' | 'tutorial' | 'article' | 'video';
      };
      context?: {
        conversationHistory?: Array<{ role: string; content: string }>;
      };
    },
  ): Promise<DocumentChunk[]> {
    try {
      const normalizedQuery = this.queryNormalizer.normalizeQuery(query);
      const rewrittenQuery = await this.queryRewriter.rewriteQuery(
        normalizedQuery,
        {
          conversationHistory: options?.context?.conversationHistory,
          domain: 'learning',
        },
      );

      const results = await this.learningRetriever.retrieveLearningResources(
        rewrittenQuery,
        {
          limit: (options?.limit || 10) * 2,
          filters: options?.filters,
        },
      );

      const reranked = await this.crossEncoderRanker.rerank(
        rewrittenQuery,
        results,
        options?.limit || 10,
      );
      const fused = this.scoreFusion.fuseScores(reranked);

      return fused.slice(0, options?.limit || 10);
    } catch (error) {
      this.logger.error(
        `Learning path RAG retrieval failed: ${error}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
