import { Injectable, Logger } from '@nestjs/common';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';
import { IntentResult } from '../../domain/types/agent.types';
import { IntentDetectionException } from '../../apis/http-exceptions/intent-detection.exception';
import { Intent } from '../../domain/enums/intent.enum';
import { PromptService } from '../prompts/prompt.service';

@Injectable()
export class IntentDetectorService {
  private readonly logger = new Logger(IntentDetectorService.name);

  // Candidate intents
  private readonly candidateIntentPatterns = {
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

  // Recruiter intents
  private readonly recruiterIntentPatterns = {
    create_job_post: [
      'create job',
      'post a job',
      'job posting',
      'job description',
      'write job',
    ],
    edit_job_post: ['edit job', 'update job', 'modify job', 'rewrite job'],
    search_candidates: [
      'find candidates',
      'search candidates',
      'talent pool',
      'candidate search',
    ],
    screen_candidate: [
      'screen candidate',
      'review candidate',
      'evaluate candidate',
      'assess candidate',
    ],
    compare_candidates: [
      'compare candidates',
      'candidate comparison',
      'compare applicants',
    ],
    generate_interview_questions: [
      'interview questions',
      'generate questions',
      'create questions',
    ],
    shortlist_candidates: ['shortlist', 'top candidates', 'best candidates'],
    candidate_scorecard: [
      'score candidate',
      'rate candidate',
      'candidate score',
    ],
    faq: ['what is', 'how to', 'explain', 'tell me about'],
  };

  constructor(
    private readonly aiService: AIService,
    private readonly promptService: PromptService,
  ) {}

  async detectIntent(
    message: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    userContext?: any,
    role?: 'candidate' | 'recruiter',
  ): Promise<IntentResult> {
    try {
      // Use LLM for more sophisticated intent detection
      const llmResult = await this.detectIntentWithLLM(
        message,
        conversationHistory,
        userContext,
        role,
      );
      console.log('llmResult', JSON.stringify(llmResult));

      return llmResult;
    } catch (error) {
      this.logger.warn(
        `LLM intent detection failed, falling back to pattern matching: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Fallback to pattern-based intent detection
      const patternResult = this.matchPatterns(message, role);

      if (patternResult) {
        this.logger.log(
          `Using pattern-based intent detection: ${patternResult.intent} (confidence: ${patternResult.confidence})`,
        );
        return patternResult;
      }

      // If pattern matching also fails, return a default FAQ intent
      this.logger.warn(
        'Both LLM and pattern-based intent detection failed. Using default FAQ intent.',
      );
      return {
        intent: Intent.FAQ,
        entities: this.extractBasicEntities(message),
        confidence: 0.3,
        requiresClarification: true,
      };
    }
  }

  private matchPatterns(
    message: string,
    role?: 'candidate' | 'recruiter',
  ): IntentResult | null {
    const lowerMessage = message.toLowerCase();
    let bestMatch: { intent: string; confidence: number } | null = null;

    // Use role-specific patterns
    const patterns =
      role === 'recruiter'
        ? this.recruiterIntentPatterns
        : this.candidateIntentPatterns;

    for (const [intent, patternList] of Object.entries(patterns)) {
      const matches = patternList.filter((pattern) =>
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
    role?: 'candidate' | 'recruiter',
  ): Promise<IntentResult> {
    const intentList = this.promptService.getIntentList(role);
    const systemPrompt = this.promptService.getIntentDetectionSystemPrompt(
      role,
      intentList,
    );

    const historyContext = conversationHistory
      .slice(-5)
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');

    const prompt = this.promptService.getIntentDetectionUserPrompt(
      message,
      historyContext,
      userContext,
    );

    const response = await this.aiService.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      maxOutputTokens: 512,
    });

    try {
      const cleanedContent = this.promptService.cleanJsonResponse(
        response.content,
      );
      const result = JSON.parse(cleanedContent);
      return {
        intent: result.intent || Intent.FAQ,
        entities: result.entities || {},
        confidence: result.confidence || 0.7,
        requiresClarification: result.requiresClarification || false,
        alternativeIntents: result.alternativeIntents,
      };
    } catch (parseError) {
      this.logger.warn(
        `Failed to parse LLM intent response: ${parseError instanceof Error ? parseError.message : String(parseError)}. Using fallback.`,
      );
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
