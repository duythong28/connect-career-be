import { Injectable, Logger } from '@nestjs/common';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';
import { EpisodicMemoryService } from '../infrastructure/memory/episodic-memory.service';
import { PromptService } from '../infrastructure/prompts/prompt.service';

@Injectable()
export class SuggestionService {
  private readonly logger = new Logger(SuggestionService.name);

  constructor(
    private readonly aiService: AIService,
    private readonly episodicMemory: EpisodicMemoryService,
    private readonly promptService: PromptService,
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

      const systemPrompt = this.promptService.getSuggestionSystemPrompt();

      const activitySummary =
        recentEvents.length > 0
          ? JSON.stringify(recentEvents.slice(-5))
          : undefined;

      const prompt = this.promptService.getSuggestionUserPrompt(
        context,
        activitySummary,
      );

      const response = await this.aiService.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        maxOutputTokens: 512,
      });

      try {
        const cleanedContent = this.promptService.cleanJsonResponse(
          response.content,
        );
        const suggestions = JSON.parse(cleanedContent);
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
