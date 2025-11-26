import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InterviewResponse } from '../../domain/entities/mock_interview_responses.entity';
import { InterviewScore } from '../../domain/entities/mock_interview_scores.entity';
import { Repository } from 'typeorm';
import OpenAI from 'openai';
import { InterviewFeedback } from '../../domain/entities/mock_interview_feedback.entity';
import { MockInterviewService } from './mock-interview.service';
import { ConfigService } from '@nestjs/config';
import { ResponseService } from './response.service';
import { AIMockInterview } from '../../domain/entities/mock_interview_sessions.entity';
import { ScoringDimension } from '../../domain/value-objects/interview-configuration.vo';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly openai: OpenAI;

  constructor(
    @InjectRepository(InterviewResponse)
    private readonly scoreRepository: Repository<InterviewScore>,
    @InjectRepository(InterviewFeedback)
    private readonly feedbackRepository: Repository<InterviewFeedback>,
    private readonly mockInterviewService: MockInterviewService,
    private readonly configService: ConfigService,
    private readonly responseService: ResponseService,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      maxRetries: 5,
      dangerouslyAllowBrowser: true,
    });
  }

  async generateInterviewAnalytics(
    callData: {
      transcript: string;
      transcript_object?: any[];
      call_analysis?: any;
      duration?: number;
    },
    sessionId: string,
  ): Promise<any> {
    try {
      const session = await this.mockInterviewService.getSession(sessionId);
      if (!session) {
        throw new BadRequestException('Interview session not found');
      }

      const prompt = this.buildAnalyticsPrompt(
        callData.transcript,
        session,
        callData.transcript_object,
      );

      const completion = await this.openai.chat.completions.create({
        model: 'gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert interview analyst. Analyze interview transcripts and provide detailed feedback, scores, and insights. Return ONLY valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content || content.trim() === '') {
        throw new BadRequestException('No analytics content received');
      }

      const cleanedContent = content
        .replace(/^```(json\s*)?/i, '')
        .replace(/```$/i, '')
        .trim();

      const analytics = JSON.parse(cleanedContent);

      if (analytics.dimensionScores) {
        for (const [dimension, score] of Object.entries(
          analytics.dimensionScores,
        )) {
          await this.scoreRepository.save({
            sessionId: session.id,
            dimension: dimension as ScoringDimension,
            score: score as number,
            details: {
              criteria: analytics.criteria?.[dimension] || [],
              evidence: analytics.evidence?.[dimension] || [],
            },
          });
        }
      }

      // Save feedback
      if (analytics.feedback) {
        for (const feedbackItem of analytics.feedback) {
          await this.feedbackRepository.save({
            sessionId: session.id,
            type: feedbackItem.type,
            content: feedbackItem.content,
            dimension: feedbackItem.dimension,
            priority: feedbackItem.priority || 'medium',
            generatedAt: new Date(),
          });
        }
      }

      // Update session results
      const results = {
        overallScore: analytics.overallScore || 0,
        dimensionScores: analytics.dimensionScores || {},
        strengths: analytics.strengths || [],
        weaknesses: analytics.weaknesses || [],
        recommendation: analytics.recommendation || [],
        learningTags: analytics.learningTags || [],
        transcript: callData.transcript,
        duration: callData.duration || 0,
      };

      await this.mockInterviewService.updateSessionResults(sessionId, results);

      return {
        overallScore: analytics.overallScore || 0,
        dimensionScores: analytics.dimensionScores || {},
        strengths: analytics.strengths || [],
        weaknesses: analytics.weaknesses || [],
        recommendations: analytics.recommendation || [],
        learningTags: analytics.learningTags || [],
        transcript: callData.transcript,
        duration: callData.duration || 0,
        communicationAnalysis: analytics.communicationAnalysis || {},
        // Include all analytics data
        ...analytics,
      };
    } catch (error) {
      this.logger.error('Error generating analytics:', error);
      throw new BadRequestException('Failed to generate analytics');
    }
  }

  private buildAnalyticsPrompt(
    transcript: string,
    session: AIMockInterview,
    transcriptObject?: any[],
  ): string {
    const questions = session.questions || [];
    const questionsText = questions
      .map((q, idx) => `${idx + 1}. ${q.question}`)
      .join('\n');

    return `
    Analyze the following interview transcript and provide comprehensive analytics.
    
    Interview Context:
    - Job Description: ${session.jobDescription || 'Not provided'}
    - Custom Prompt: ${session.customPrompt || 'Not provided'}
    - Difficulty: ${session.configuration.difficulty}
    - Focus Areas: ${session.configuration.focusAreas.join(', ') || 'General'}
    
    Interview Questions:
    ${questionsText || 'No specific questions provided'}
    
    Interview Transcript:
    """
    ${transcript}
    """
    
    Please provide a comprehensive analysis in the following JSON format:
    {
      "overallScore": number (0-100),
      "dimensionScores": {
        "content": number (0-100),
        "depth": number (0-100),
        "communication": number (0-100),
        "technical_skills": number (0-100),
        "problem_solving": number (0-100),
        "time_management": number (0-100),
        "confidence": number (0-100)
      },
      "strengths": ["string", "string"],
      "weaknesses": ["string", "string"],
      "recommendation": ["string", "string"],
      "learningTags": ["string", "string"],
      "criteria": {
        "dimension_name": ["criteria1", "criteria2"]
      },
      "evidence": {
        "dimension_name": ["evidence1", "evidence2"]
      },
      "feedback": [
        {
          "type": "coaching" | "improvement" | "strength" | "action_item",
          "content": "string",
          "dimension": "string",
          "priority": "high" | "medium" | "low"
        }
      ]
    }
    
    Focus on:
    1. Content quality and relevance of answers
    2. Depth of technical knowledge demonstrated
    3. Communication clarity and structure
    4. Problem-solving approach
    5. Time management and conciseness
    6. Confidence and professionalism
    
    Return ONLY the JSON object, no additional text.
        `.trim();
  }
}
