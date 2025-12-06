import { Injectable, Logger } from '@nestjs/common';
import { FaqStore } from '../stores/faq.store';
import { DocumentChunk } from '../stores/base.store';

@Injectable()
export class FaqIngestionService {
  private readonly logger = new Logger(FaqIngestionService.name);

  constructor(private readonly faqStore: FaqStore) {}

  async ingestFaq(faq: {
    id: string;
    question: string;
    answer: string;
    category?: string;
    tags?: string[];
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const chunk: DocumentChunk = {
        id: faq.id,
        content: `Q: ${faq.question}\nA: ${faq.answer}`,
        embedding: await this.generateEmbedding(`${faq.question} ${faq.answer}`),
        metadata: {
          source: faq.id,
          type: 'faq',
          question: faq.question,
          answer: faq.answer,
          category: faq.category,
          tags: faq.tags,
          ...faq.metadata,
        },
      };

      await this.faqStore.addDocuments([chunk]);
      this.logger.log(`Ingested FAQ ${faq.id}`);
    } catch (error) {
      this.logger.error(`Failed to ingest FAQ ${faq.id}: ${error}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const dimensions = 768;
    const embedding = new Array(dimensions).fill(0).map(() => Math.random() - 0.5);
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / norm);
  }
}

