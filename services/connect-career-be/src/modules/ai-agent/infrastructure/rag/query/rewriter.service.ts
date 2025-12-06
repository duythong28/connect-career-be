import { Injectable, Logger } from '@nestjs/common';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';

@Injectable()
export class QueryRewriterService {
  private readonly logger = new Logger(QueryRewriterService.name);

  constructor(private readonly aiService: AIService) {}

  async rewriteQuery(
    query: string,
    context?: {
      conversationHistory?: Array<{ role: string; content: string }>;
      domain?: 'job' | 'company' | 'learning' | 'faq';
    },
  ): Promise<string> {
    try {
      const systemPrompt = `You are a query rewriter for a career assistant RAG system.
Rewrite the user's query to be more effective for semantic search and retrieval.
Make it:
- More specific and detailed
- Include relevant keywords
- Remove ambiguity
- Maintain the original intent

Return only the rewritten query, no explanation.`;

      const contextPrompt = context?.conversationHistory
        ? `Previous conversation:\n${context.conversationHistory
            .slice(-3)
            .map((m) => `${m.role}: ${m.content}`)
            .join('\n')}\n\n`
        : '';

      const domainHint = context?.domain
        ? `Domain context: ${context.domain} (jobs, companies, learning resources, or FAQs)\n\n`
        : '';

      const prompt = `${contextPrompt}${domainHint}User query: "${query}"\n\nRewritten query:`;

      const response = await this.aiService.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        maxOutputTokens: 256,
      });

      return response.content.trim();
    } catch (error) {
      this.logger.warn(`Query rewriting failed, using original: ${error}`);
      return query;
    }
  }
}
