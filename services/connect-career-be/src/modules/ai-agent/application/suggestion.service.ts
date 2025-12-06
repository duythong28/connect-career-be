import { Injectable, Logger } from '@nestjs/common';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';
import { EpisodicMemoryService } from '../infrastructure/memory/episodic-memory.service';

@Injectable()
export class SuggestionService {
  private readonly logger = new Logger(SuggestionService.name);

  constructor(
    private readonly aiService: AIService,
    private readonly episodicMemory: EpisodicMemoryService,
  ) {}

  async getSuggestions(
    userId: string,
    sessionId?: string,
    context?: string,
    metadata?: Record<string, any>,
  ): Promise<string[]> {
    try {
      // Retrieve user's recent activity from memory
      const recentEvents = await this.episodicMemory.retrieveEvents(userId, {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        end: new Date(),
      });

      const systemPrompt = `You are a proactive career assistant. Based on the user's context and recent activity, suggest helpful next actions.
Suggestions should be:
- Relevant to their career goals
- Actionable and specific
- Limited to 3-5 suggestions
- Friendly and encouraging

Return a JSON array of suggestion strings.`;

      const contextPrompt = context
        ? `Current context: ${context}`
        : 'No specific context provided.';

      const activitySummary = recentEvents.length > 0
        ? `Recent activity: ${JSON.stringify(recentEvents.slice(-5))}`
        : 'No recent activity found.';

      const prompt = `${contextPrompt}\n\n${activitySummary}\n\nGenerate proactive suggestions for the user.`;

      const response = await this.aiService.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        maxOutputTokens: 512,
      });

      try {
        const suggestions = JSON.parse(response.content);
        return Array.isArray(suggestions) ? suggestions : [];
      } catch (parseError) {
        // Fallback: extract suggestions from text
        return this.extractSuggestionsFromText(response.content);
      }
    } catch (error) {
      this.logger.error(
        `Failed to generate suggestions: ${error}`,
        error instanceof Error ? error.stack : undefined,
      );
      return this.getDefaultSuggestions();
    }
  }

  private extractSuggestionsFromText(text: string): string[] {
    // Simple extraction: look for numbered or bulleted items
    const lines = text.split('\n');
    const suggestions: string[] = [];

    for (const line of lines) {
      const match = line.match(/^[\d\-\*•]\s*(.+)$/);
      if (match) {
        suggestions.push(match[1].trim());
      }
    }

    return suggestions.length > 0 ? suggestions : this.getDefaultSuggestions();
  }

  private getDefaultSuggestions(): string[] {
    return [
      'Search for jobs matching your skills',
      'Update your profile to attract recruiters',
      'Explore learning paths to improve your skills',
      'Review your application status',
      'Get interview preparation tips',
    ];
  }
}

