import { Injectable, Logger } from '@nestjs/common';
import { DocumentChunk } from '../stores/base.store';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';

@Injectable()
export class CrossEncoderRanker {
  private readonly logger = new Logger(CrossEncoderRanker.name);
  private readonly maxConcurrentRequests: number = 3; // Limit concurrent API calls
  private readonly delayBetweenBatches: number = 100; // 100ms delay between batches

  constructor(private readonly aiService: AIService) {}

  async rerank(
    query: string,
    documents: DocumentChunk[],
    topK: number = 10,
  ): Promise<DocumentChunk[]> {
    if (documents.length === 0) {
      return [];
    }

    try {
      // Process documents in batches to avoid rate limiting
      const scoredDocuments: Array<DocumentChunk & { score: number }> = [];

      for (let i = 0; i < documents.length; i += this.maxConcurrentRequests) {
        const batch = documents.slice(i, i + this.maxConcurrentRequests);

        // Process batch with limited concurrency
        const batchResults = await Promise.all(
          batch.map(async (doc) => {
            const score = await this.scoreRelevance(query, doc.content);
            return { ...doc, score };
          }),
        );

        scoredDocuments.push(...batchResults);

        // Add delay between batches to avoid rate limiting
        if (i + this.maxConcurrentRequests < documents.length) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.delayBetweenBatches),
          );
        }
      }

      // Sort by score and return top K
      return scoredDocuments
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, topK);
    } catch (error) {
      this.logger.warn(
        `Cross-encoder ranking failed, using original order: ${error}`,
      );
      return documents.slice(0, topK);
    }
  }

  private async scoreRelevance(
    query: string,
    document: string,
  ): Promise<number> {
    const systemPrompt = `You are a relevance scorer for a RAG system.
Score how relevant the document is to the query on a scale of 0.0 to 1.0.
Return only a number between 0.0 and 1.0.`;

    const prompt = `Query: "${query}"\n\nDocument: "${document.substring(0, 500)}"\n\nRelevance score (0.0-1.0):`;

    try {
      const response = await this.aiService.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        maxOutputTokens: 10,
      });

      const score = parseFloat(response.content.trim());
      return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
    } catch (error) {
      this.logger.warn(`Relevance scoring failed: ${error}`);
      return 0.5;
    }
  }
}
