import { Injectable, Logger } from '@nestjs/common';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';

@Injectable()
export class QueryExpanderService {
  private readonly logger = new Logger(QueryExpanderService.name);

  constructor(private readonly aiService: AIService) {}

  async expandQuery(
    query: string,
    options?: {
      maxExpansions?: number;
      domain?: 'job' | 'company' | 'learning' | 'faq';
    },
  ): Promise<string[]> {
    try {
      const maxExpansions = options?.maxExpansions || 3;

      const systemPrompt = `You are a query expansion expert for a career assistant RAG system.
Generate alternative phrasings and related queries for semantic search.
Create ${maxExpansions} variations that:
- Use synonyms and related terms
- Include different phrasings
- Cover related concepts
- Maintain the original intent

Return a JSON array of query strings only.`;

      const domainHint = options?.domain
        ? `Domain: ${options.domain}\n\n`
        : '';

      const prompt = `${domainHint}Original query: "${query}"\n\nGenerate ${maxExpansions} query variations as JSON array:`;

      const response = await this.aiService.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        maxOutputTokens: 512,
      });

      try {
        const expansions = JSON.parse(response.content);
        return Array.isArray(expansions) ? expansions : [query];
      } catch (parseError) {
        // Fallback: extract from text
        return this.extractQueriesFromText(response.content) || [query];
      }
    } catch (error) {
      this.logger.warn(`Query expansion failed, using original: ${error}`);
      return [query];
    }
  }

  private extractQueriesFromText(text: string): string[] {
    // Simple extraction - look for quoted strings or numbered items
    const matches = text.match(/"([^"]+)"/g) || text.match(/\d+\.\s*(.+)/g);
    if (matches) {
      return matches.map(m => m.replace(/^["\d.\s]+|"$/g, '').trim()).filter(Boolean);
    }
    return [];
  }
}

