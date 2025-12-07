import { Injectable, Logger } from '@nestjs/common';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';
import { IntentResult } from '../../domain/types/agent.types';
import { IntentDetectionException } from '../../apis/http-exceptions/intent-detection.exception';
import { Intent } from '../../domain/enums/intent.enum';

@Injectable()
export class IntentDetectorService {
  private readonly logger = new Logger(IntentDetectorService.name);

  // Common intents in career assistant domain
  private readonly intentPatterns = {
    job_search: [
      'find job',
      'search job',
      'looking for',
      'job opening',
      'position',
    ],
    job_match: ['match', 'suitable', 'fit', 'recommend job'],
    career_path: [
      'career path',
      'career plan',
      'career guidance',
      'career advice',
    ],
    skill_gap: [
      'skill gap',
      'missing skills',
      'need to learn',
      'improve skills',
    ],
    interview_prep: [
      'interview',
      'mock interview',
      'prepare interview',
      'interview questions',
    ],
    cv_review: ['review cv', 'cv feedback', 'resume review', 'improve cv'],
    company_research: [
      'company info',
      'about company',
      'company culture',
      'company research',
    ],
    application_status: [
      'application status',
      'my application',
      'application update',
    ],
    learning_path: ['learn', 'course', 'training', 'tutorial', 'study'],
    comparison: [
      'compare',
      'difference between',
      'vs',
      'versus',
      'which is better',
    ],
    faq: ['what is', 'how to', 'explain', 'tell me about'],
  };

  constructor(private readonly aiService: AIService) {}

  async detectIntent(
    message: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    userContext?: any,
  ): Promise<IntentResult> {
    try {
      // First, try pattern matching for quick detection
      const patternMatch = this.matchPatterns(message);
      if (patternMatch && patternMatch.confidence > 0.8) {
        return patternMatch;
      }

      // Use LLM for more sophisticated intent detection
      const llmResult = await this.detectIntentWithLLM(
        message,
        conversationHistory,
        userContext,
      );

      // Combine pattern and LLM results
      if (patternMatch && llmResult.confidence < 0.7) {
        return patternMatch;
      }

      return llmResult;
    } catch (error) {
      this.logger.error(
        `Intent detection failed: ${error}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new IntentDetectionException(
        'Failed to detect intent',
        'I had trouble understanding your request. Could you please rephrase?',
        error,
      );
    }
  }

  private matchPatterns(message: string): IntentResult | null {
    const lowerMessage = message.toLowerCase();
    let bestMatch: { intent: string; confidence: number } | null = null;

    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      const matches = patterns.filter((pattern) =>
        lowerMessage.includes(pattern),
      );
      if (matches.length > 0) {
        const confidence = Math.min(0.9, 0.5 + matches.length * 0.1);
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { intent, confidence };
        }
      }
    }

    if (!bestMatch) {
      return null;
    }

    return {
      intent: bestMatch.intent,
      entities: this.extractBasicEntities(message),
      confidence: bestMatch.confidence,
      requiresClarification: bestMatch.confidence < 0.7,
    };
  }

  private async detectIntentWithLLM(
    message: string,
    conversationHistory: Array<{ role: string; content: string }>,
    userContext?: any,
  ): Promise<IntentResult> {
    const systemPrompt = `You are an intent classifier for a career assistant AI system.
Analyze the user's message and classify it into one of these intents:
- job_search: User wants to find jobs
- job_match: User wants job recommendations based on their profile
- career_path: User wants career planning advice
- skill_gap: User wants to know what skills they need
- interview_prep: User wants interview preparation help
- cv_review: User wants CV/resume feedback
- company_research: User wants information about companies
- application_status: User wants to check application status
- learning_path: User wants learning resources
- comparison: User wants to compare jobs/companies/offers
- faq: General questions

Also extract relevant entities like: job titles, skills, companies, locations, etc.

Return JSON with: { intent, entities: {}, confidence: 0.0-1.0, requiresClarification: boolean }`;

    const historyContext = conversationHistory
      .slice(-5)
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');

    const prompt = `User message: "${message}"
${historyContext ? `\nRecent conversation:\n${historyContext}` : ''}
${userContext ? `\nUser context: ${JSON.stringify(userContext)}` : ''}

Classify the intent and extract entities.`;

    const response = await this.aiService.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      maxOutputTokens: 512,
    });

    try {
      const result = JSON.parse(response.content);
      return {
        intent: result.intent || Intent.FAQ,
        entities: result.entities || {},
        confidence: result.confidence || 0.7,
        requiresClarification: result.requiresClarification || false,
        alternativeIntents: result.alternativeIntents,
      };
    } catch (parseError) {
      this.logger.warn('Failed to parse LLM intent response, using fallback');
      return {
        intent: Intent.FAQ,
        entities: {},
        confidence: 0.5,
        requiresClarification: true,
      };
    }
  }

  private extractBasicEntities(message: string): Record<string, any> {
    const entities: Record<string, any> = {};

    // Simple entity extraction (can be enhanced with NER)
    const jobTitlePattern =
      /\b(senior|junior|lead|principal)?\s*(software engineer|developer|manager|designer|analyst|consultant)\b/gi;
    const matches = message.match(jobTitlePattern);
    if (matches) {
      entities.jobTitles = matches;
    }

    return entities;
  }
}
