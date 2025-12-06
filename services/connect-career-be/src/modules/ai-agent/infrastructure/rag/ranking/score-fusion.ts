import { Injectable } from '@nestjs/common';
import { DocumentChunk } from '../stores/base.store';

export interface ScoreFusionOptions {
  vectorWeight?: number;
  keywordWeight?: number;
  crossEncoderWeight?: number;
  recencyWeight?: number;
}

@Injectable()
export class ScoreFusionService {
  fuseScores(
    documents: DocumentChunk[],
    options: ScoreFusionOptions = {},
  ): DocumentChunk[] {
    const {
      vectorWeight = 0.4,
      keywordWeight = 0.3,
      crossEncoderWeight = 0.2,
      recencyWeight = 0.1,
    } = options;

    return documents.map((doc) => {
      const vectorScore = doc.score || 0;
      const keywordScore = doc.metadata.keywordScore || 0;
      const crossEncoderScore = doc.metadata.crossEncoderScore || 0;
      const recencyScore = this.calculateRecencyScore(doc.metadata.timestamp);

      const fusedScore =
        vectorScore * vectorWeight +
        keywordScore * keywordWeight +
        crossEncoderScore * crossEncoderWeight +
        recencyScore * recencyWeight;

      return {
        ...doc,
        score: fusedScore,
        metadata: {
          ...doc.metadata,
          fusedScore,
          scoreBreakdown: {
            vector: vectorScore,
            keyword: keywordScore,
            crossEncoder: crossEncoderScore,
            recency: recencyScore,
          },
        },
      };
    }).sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  private calculateRecencyScore(timestamp?: Date | string): number {
    if (!timestamp) {
      return 0.5; // Default score if no timestamp
    }

    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const daysSince = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);

    // Exponential decay: newer documents get higher scores
    // Score = e^(-days/30), so after 30 days, score is ~0.37
    return Math.exp(-daysSince / 30);
  }
}

