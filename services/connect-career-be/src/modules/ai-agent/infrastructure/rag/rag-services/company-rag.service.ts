import { Injectable, Logger } from '@nestjs/common';
import { CompanyRetriever } from '../retrieval/company-retriever';
import { QueryRewriterService } from '../query/rewriter.service';
import { QueryExpanderService } from '../query/expander.service';
import { QueryNormalizerService } from '../query/normalizer.service';
import { CrossEncoderRanker } from '../ranking/cross-encoder-ranker';
import { ScoreFusionService } from '../ranking/score-fusion';
import { DocumentChunk } from '../stores/base.store';

@Injectable()
export class CompanyRagService {
  private readonly logger = new Logger(CompanyRagService.name);

  constructor(
    private readonly companyRetriever: CompanyRetriever,
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
        industry?: string;
        size?: string;
        location?: string;
      };
      context?: {
        conversationHistory?: Array<{ role: string; content: string }>;
      };
    },
  ): Promise<DocumentChunk[]> {
    try {
      const normalizedQuery = this.queryNormalizer.normalizeQuery(query);
      const rewrittenQuery = await this.queryRewriter.rewriteQuery(normalizedQuery, {
        conversationHistory: options?.context?.conversationHistory,
        domain: 'company',
      });

      const results = await this.companyRetriever.retrieveCompanies(rewrittenQuery, {
        limit: (options?.limit || 10) * 2,
        filters: options?.filters,
      });

      const reranked = await this.crossEncoderRanker.rerank(rewrittenQuery, results, options?.limit || 10);
      const fused = this.scoreFusion.fuseScores(reranked);

      return fused.slice(0, options?.limit || 10);
    } catch (error) {
      this.logger.error(`Company RAG retrieval failed: ${error}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }
}

