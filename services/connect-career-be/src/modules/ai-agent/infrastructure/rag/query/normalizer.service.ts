import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class QueryNormalizerService {
  private readonly logger = new Logger(QueryNormalizerService.name);

  normalizeQuery(query: string): string {
    // Remove extra whitespace
    let normalized = query.trim().replace(/\s+/g, ' ');

    // Remove special characters that might interfere with search
    normalized = normalized.replace(/[^\w\s-]/g, ' ');

    // Convert to lowercase for consistency (optional - depends on use case)
    // normalized = normalized.toLowerCase();

    // Remove common stop words (optional - can be domain-specific)
    // normalized = this.removeStopWords(normalized);

    return normalized.trim();
  }

  extractKeywords(query: string): string[] {
    const normalized = this.normalizeQuery(query);
    const words = normalized.split(/\s+/);
    
    // Filter out very short words
    return words.filter(word => word.length > 2);
  }

  private removeStopWords(text: string): string {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
      'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this',
      'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    ]);

    return text
      .split(/\s+/)
      .filter(word => !stopWords.has(word.toLowerCase()))
      .join(' ');
  }
}

