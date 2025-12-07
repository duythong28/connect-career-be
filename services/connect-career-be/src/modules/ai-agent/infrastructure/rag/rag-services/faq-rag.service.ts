import { Injectable, Logger } from '@nestjs/common';
import { FaqRetriever } from '../retrieval/faq-retriever';
import { QueryRewriterService } from '../query/rewriter.service';
import { QueryNormalizerService } from '../query/normalizer.service';
import { CrossEncoderRanker } from '../ranking/cross-encoder-ranker';
import { ScoreFusionService } from '../ranking/score-fusion';
import { DocumentChunk } from '../stores/base.store';

@Injectable()
export class FaqRagService {
  private readonly logger = new Logger(FaqRagService.name);

  constructor(
    private readonly faqRetriever: FaqRetriever,
    private readonly queryRewriter: QueryRewriterService,
    private readonly queryNormalizer: QueryNormalizerService,
    private readonly crossEncoderRanker: CrossEncoderRanker,
    private readonly scoreFusion: ScoreFusionService,
  ) {}

  async retrieve(
    query: string,
    options?: {
      limit?: number;
      filters?: {
        category?: string;
        tags?: string[];
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
          domain: 'faq',
        },
      );

      const results = await this.faqRetriever.retrieveFaqs(rewrittenQuery, {
        limit: (options?.limit || 10) * 2,
        filters: options?.filters,
      });

      const reranked = await this.crossEncoderRanker.rerank(
        rewrittenQuery,
        results,
        options?.limit || 10,
      );
      const fused = this.scoreFusion.fuseScores(reranked);

      return fused.slice(0, options?.limit || 10);
    } catch (error) {
      this.logger.error(
        `FAQ RAG retrieval failed: ${error}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
