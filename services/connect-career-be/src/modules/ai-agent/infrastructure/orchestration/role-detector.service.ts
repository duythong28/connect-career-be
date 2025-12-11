import { Injectable, Logger } from '@nestjs/common';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';
import { UserRole } from '../../domain/types/agent-state.type';

export interface RoleDetectionResult {
  role: UserRole;
  confidence: number;
  reasoning?: string;
}

@Injectable()
export class RoleDetectorService {
  private readonly logger = new Logger(RoleDetectorService.name);

  constructor(private readonly aiService: AIService) {}

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
    const systemPrompt = `You are a role classifier for a career assistant AI system.
Analyze the user's message and determine if they are a:
- candidate: Someone looking for jobs, career advice, or job-related help
- recruiter: Someone hiring, managing job postings, or screening candidates

Return JSON with: { role: "candidate" | "recruiter", confidence: 0.0-1.0, reasoning: "brief explanation" }`;

    const historyContext = conversationHistory
      .slice(-3)
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');

    const prompt = `User message: "${message}"
${historyContext ? `\nRecent conversation:\n${historyContext}` : ''}

Classify the user's role.`;

    try {
      const response = await this.aiService.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        maxOutputTokens: 256,
      });

      const result = JSON.parse(response.content);
      return {
        role: result.role || 'candidate',
        confidence: result.confidence || 0.7,
        reasoning: result.reasoning,
      };
    } catch (error) {
      this.logger.warn('Failed to parse LLM role response, using default');
      return {
        role: 'candidate', // Default to candidate
        confidence: 0.5,
      };
    }
  }
}

