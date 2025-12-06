import { Injectable, Logger } from '@nestjs/common';
import { CompanyStore } from '../stores/company.store';
import { DocumentChunk } from '../stores/base.store';

@Injectable()
export class CompanyIngestionService {
  private readonly logger = new Logger(CompanyIngestionService.name);

  constructor(private readonly companyStore: CompanyStore) {}

  async ingestCompany(company: {
    id: string;
    name: string;
    description: string;
    industry?: string;
    size?: string;
    location?: string;
    culture?: string;
    benefits?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const chunks = await this.chunkCompany(company);
      const chunksWithEmbeddings = await Promise.all(
        chunks.map(async (chunk) => ({
          ...chunk,
          embedding: await this.generateEmbedding(chunk.content),
        })),
      );

      await this.companyStore.addDocuments(chunksWithEmbeddings);
      this.logger.log(`Ingested company ${company.id} with ${chunks.length} chunks`);
    } catch (error) {
      this.logger.error(`Failed to ingest company ${company.id}: ${error}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  private async chunkCompany(company: {
    id: string;
    name: string;
    description: string;
    industry?: string;
    size?: string;
    location?: string;
    culture?: string;
    benefits?: string;
    metadata?: Record<string, any>;
  }): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];

    // Header chunk
    chunks.push({
      id: `${company.id}_header`,
      content: `Company: ${company.name}\n${company.industry ? `Industry: ${company.industry}\n` : ''}${company.size ? `Size: ${company.size}\n` : ''}${company.location ? `Location: ${company.location}` : ''}`,
      metadata: {
        source: company.id,
        type: 'company_header',
        name: company.name,
        industry: company.industry,
        size: company.size,
        location: company.location,
        ...company.metadata,
      },
    });

    // Description chunk
    if (company.description) {
      chunks.push({
        id: `${company.id}_description`,
        content: company.description,
        metadata: {
          source: company.id,
          type: 'company_description',
          name: company.name,
          ...company.metadata,
        },
      });
    }

    // Culture chunk
    if (company.culture) {
      chunks.push({
        id: `${company.id}_culture`,
        content: `Company Culture: ${company.culture}`,
        metadata: {
          source: company.id,
          type: 'company_culture',
          name: company.name,
          ...company.metadata,
        },
      });
    }

    // Benefits chunk
    if (company.benefits) {
      chunks.push({
        id: `${company.id}_benefits`,
        content: `Benefits: ${company.benefits}`,
        metadata: {
          source: company.id,
          type: 'company_benefits',
          name: company.name,
          ...company.metadata,
        },
      });
    }

    return chunks;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const dimensions = 768;
    const embedding = new Array(dimensions).fill(0).map(() => Math.random() - 0.5);
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / norm);
  }
}

