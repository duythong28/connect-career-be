import { Injectable, Logger } from '@nestjs/common';
import { JobRagService } from './job-rag.service';
import { CompanyRagService } from './company-rag.service';
import { LearningPathRagService } from './learning-path-rag.service';
import { FaqRagService } from './faq-rag.service';
import { DocumentChunk } from '../stores/base.store';

@Injectable()
export class MultiRagService {
  private readonly logger = new Logger(MultiRagService.name);

  constructor(
    private readonly jobRag: JobRagService,
    private readonly companyRag: CompanyRagService,
    private readonly learningRag: LearningPathRagService,
    private readonly faqRag: FaqRagService,
  ) {}

  async retrieve(
    query: string,
    domains: Array<'job' | 'company' | 'learning' | 'faq'>,
    options?: {
      limitPerDomain?: number;
      totalLimit?: number;
      context?: {
        conversationHistory?: Array<{ role: string; content: string }>;
      };
    },
  ): Promise<{
    results: DocumentChunk[];
    byDomain: Record<string, DocumentChunk[]>;
  }> {
    try {
      const limitPerDomain = options?.limitPerDomain || 5;
      const totalLimit = options?.totalLimit || 20;

      const resultsByDomain: Record<string, DocumentChunk[]> = {};
      const allResults: DocumentChunk[] = [];

      // Retrieve from each domain
      const retrievalPromises = domains.map(async (domain) => {
        try {
          let results: DocumentChunk[] = [];

          switch (domain) {
            case 'job':
              results = await this.jobRag.retrieve(query, {
                limit: limitPerDomain,
                context: options?.context,
              });
              break;
            case 'company':
              results = await this.companyRag.retrieve(query, {
                limit: limitPerDomain,
                context: options?.context,
              });
              break;
            case 'learning':
              results = await this.learningRag.retrieve(query, {
                limit: limitPerDomain,
                context: options?.context,
              });
              break;
            case 'faq':
              results = await this.faqRag.retrieve(query, {
                limit: limitPerDomain,
                context: options?.context,
              });
              break;
          }

          resultsByDomain[domain] = results;
          return results;
        } catch (error) {
          this.logger.warn(`Retrieval failed for domain ${domain}: ${error}`);
          return [];
        }
      });

      const allDomainResults = await Promise.all(retrievalPromises);

      // Combine and deduplicate
      const uniqueIds = new Set<string>();
      for (const domainResults of allDomainResults) {
        for (const result of domainResults) {
          if (!uniqueIds.has(result.id)) {
            uniqueIds.add(result.id);
            allResults.push(result);
          }
        }
      }

      // Sort by score and limit
      const sorted = allResults
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, totalLimit);

      return {
        results: sorted,
        byDomain: resultsByDomain,
      };
    } catch (error) {
      this.logger.error(`Multi-RAG retrieval failed: ${error}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }
}

