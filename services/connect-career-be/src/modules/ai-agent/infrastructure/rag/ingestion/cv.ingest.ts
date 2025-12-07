import { Injectable, Logger } from '@nestjs/common';
import { DocumentChunk } from '../stores/base.store';

@Injectable()
export class CvIngestionService {
  private readonly logger = new Logger(CvIngestionService.name);

  async ingestCv(cv: {
    id: string;
    userId: string;
    content: string;
    sections?: {
      experience?: string;
      education?: string;
      skills?: string[];
      summary?: string;
    };
    metadata?: Record<string, any>;
  }): Promise<DocumentChunk[]> {
    try {
      const chunks = await this.chunkCv(cv);
      const chunksWithEmbeddings = await Promise.all(
        chunks.map(async (chunk) => ({
          ...chunk,
          embedding: await this.generateEmbedding(chunk.content),
        })),
      );

      this.logger.log(`Ingested CV ${cv.id} with ${chunks.length} chunks`);
      return chunksWithEmbeddings;
    } catch (error) {
      this.logger.error(
        `Failed to ingest CV ${cv.id}: ${error}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  private async chunkCv(cv: {
    id: string;
    userId: string;
    content: string;
    sections?: {
      experience?: string;
      education?: string;
      skills?: string[];
      summary?: string;
    };
    metadata?: Record<string, any>;
  }): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];

    // Summary chunk
    if (cv.sections?.summary) {
      chunks.push({
        id: `${cv.id}_summary`,
        content: `Professional Summary: ${cv.sections.summary}`,
        metadata: {
          source: cv.id,
          userId: cv.userId,
          type: 'cv_summary',
          ...cv.metadata,
        },
      });
    }

    // Skills chunk
    if (cv.sections?.skills && cv.sections.skills.length > 0) {
      chunks.push({
        id: `${cv.id}_skills`,
        content: `Skills: ${cv.sections.skills.join(', ')}`,
        metadata: {
          source: cv.id,
          userId: cv.userId,
          type: 'cv_skills',
          skills: cv.sections.skills,
          ...cv.metadata,
        },
      });
    }

    // Experience chunk
    if (cv.sections?.experience) {
      chunks.push({
        id: `${cv.id}_experience`,
        content: `Work Experience: ${cv.sections.experience}`,
        metadata: {
          source: cv.id,
          userId: cv.userId,
          type: 'cv_experience',
          ...cv.metadata,
        },
      });
    }

    // Education chunk
    if (cv.sections?.education) {
      chunks.push({
        id: `${cv.id}_education`,
        content: `Education: ${cv.sections.education}`,
        metadata: {
          source: cv.id,
          userId: cv.userId,
          type: 'cv_education',
          ...cv.metadata,
        },
      });
    }

    return chunks;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const dimensions = 768;
    const embedding = new Array(dimensions)
      .fill(0)
      .map(() => Math.random() - 0.5);
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map((val) => val / norm);
  }
}
