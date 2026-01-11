import { Injectable, Logger } from '@nestjs/common';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';
import { UserRole } from '../../domain/types/agent-state.type';
import { PromptService } from '../prompts/prompt.service';

export interface RoleDetectionResult {
  role: UserRole;
  confidence: number;
  reasoning?: string;
}

@Injectable()
export class RoleDetectorService {
  private readonly logger = new Logger(RoleDetectorService.name);

  constructor(
    private readonly aiService: AIService,
    private readonly promptService: PromptService,
  ) {}

  async detectRole(
    message: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    userProfile?: any,
  ): Promise<RoleDetectionResult> {
    // If user profile has explicit role, use it
    if (userProfile?.role) {
      return {
        role: userProfile.role as UserRole,
        confidence: 1.0,
      };
    }

    // Pattern matching for quick detection
    const patternMatch = this.matchRolePatterns(message);
    if (patternMatch && patternMatch.confidence > 0.8) {
      return patternMatch;
    }

    // Use LLM for sophisticated detection
    return await this.detectRoleWithLLM(message, conversationHistory);
  }

  private matchRolePatterns(message: string): RoleDetectionResult | null {
    const lowerMessage = message.toLowerCase();

    // Candidate patterns
    const candidatePatterns = [
      'find job',
      'looking for job',
      'apply for',
      'my cv',
      'my resume',
      'job search',
      'career advice',
      'interview prep',
      'application status',
      'match me with jobs',
      'show me jobs',
      'career path',
      'skill gap',
      'improve my cv',
    ];

    // Recruiter patterns
    const recruiterPatterns = [
      'hire',
      'recruit',
      'candidate',
      'job posting',
      'job description',
      'screen candidate',
      'shortlist',
      'talent pool',
      'create job',
      'post a job',
      'find candidates',
      'compare candidates',
      'score candidate',
      'generate interview questions',
    ];

    const candidateMatches = candidatePatterns.filter((pattern) =>
      lowerMessage.includes(pattern),
    ).length;
    const recruiterMatches = recruiterPatterns.filter((pattern) =>
      lowerMessage.includes(pattern),
    ).length;

    if (candidateMatches > recruiterMatches && candidateMatches > 0) {
      return {
        role: 'candidate',
        confidence: Math.min(0.9, 0.6 + candidateMatches * 0.1),
      };
    }

    if (recruiterMatches > candidateMatches && recruiterMatches > 0) {
      return {
        role: 'recruiter',
        confidence: Math.min(0.9, 0.6 + recruiterMatches * 0.1),
      };
    }

    return null;
  }

  private async detectRoleWithLLM(
    message: string,
    conversationHistory: Array<{ role: string; content: string }>,
  ): Promise<RoleDetectionResult> {
    const systemPrompt = this.promptService.getRoleDetectionSystemPrompt();

    const historyContext = conversationHistory
      .slice(-3)
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');

    const prompt = this.promptService.getRoleDetectionUserPrompt(
      message,
      historyContext,
    );

    try {
      const response = await this.aiService.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        maxOutputTokens: 256,
      });

      const cleanedContent = this.promptService.cleanJsonResponse(
        response.content,
      );
      const result = JSON.parse(cleanedContent);
      console.log('result', JSON.stringify(result, null, 2));
      return {
        role: result.role || 'candidate',
        confidence: result.confidence || 0.7,
        reasoning: result.reasoning,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to parse LLM role response: ${error instanceof Error ? error.message : String(error)}. Using default.`,
      );
      return {
        role: 'candidate', // Default to candidate
        confidence: 0.5,
      };
    }
  }
}
