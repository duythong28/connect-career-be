import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { AgentInterviewerService } from '../services/agent-interviewer.service';
import { ResponseService } from '../services/response.service';
import { RetellAIProvider } from 'src/shared/infrastructure/external-services/ai/providers/retell-ai.provider';
import { Public } from 'src/modules/identity/api/decorators';
import { RegisterCallDto } from '../dto/register-call.dto';
import { JwtAuthGuard } from 'src/modules/identity/api/guards/jwt-auth.guard';
import { GenerateInsightsDto } from '../dto/generate-insights.dto';
import { AnalyzeCommunicationDto } from '../dto/anlyze-communication.dto';
import { MockInterviewService } from '../services/mock-interview.service';
import { ScoringDimension } from '../../domain/value-objects/interview-configuration.vo';

export interface InterviewResults {
  overallScore: number;
  dimensionScores: Record<ScoringDimension, number>;
  strengths: string[];
  weaknesses: string[];
  recommendation: string[];
  learningTags: string[];
  transcript: string;
  duration: number;
  insights?: {
    overallTrends?: string;
    commonStrengths?: string[];
    commonWeaknesses?: string[];
    recommendations?: string[];
    keyLearnings?: string[];
  };
}

@Controller('v1/call/mock-ai-interview')
export class MockInterviewCallController {
  private readonly logger = new Logger(MockInterviewCallController.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly interviewerService: AgentInterviewerService,
    private readonly responseService: ResponseService,
    private readonly retellAIProvider: RetellAIProvider,
    private readonly mockInterviewService: MockInterviewService,
    private readonly configService: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      maxRetries: 5,
      dangerouslyAllowBrowser: true,
    });
  }

  @Post('register-call')
  @Public()
  async registerCall(@Body() dto: RegisterCallDto) {
    const interviewer = await this.interviewerService.getInterviewerById(
      dto.interviewerId,
    );
    if (!interviewer) {
      throw new BadRequestException('Interviewer not found');
    }
    const dynamicVariables = {
      customer_name: dto.name,
      interview_session_id: dto.sessionId,
      ...dto.dynamicData,
    };

    const { callId, accessToken } = await this.retellAIProvider.createWebCall(
      interviewer.retellAgentId,
      dynamicVariables,
    );

    const response = await this.responseService.createResponse(
      dto.sessionId,
      callId,
      dto.email || '',
      dto.name || '',
    );
    return {
      success: true,
      data: {
        callId,
        accessToken,
        responseId: response.id,
      },
    };
  }

  @Get('get-call/:callId')
  @Public()
  async getCall(@Param('callId') callId: string) {
    const response = await this.responseService.getResponseByCallId(callId);

    if (response.isAnalysed && response.analytics) {
      return {
        success: true,
        data: {
          response,
          analytics: response.analytics,
        },
      };
    }
    try {
      const callData = await this.retellAIProvider.retrieveCallDetails(callId);
      return {
        success: true,
        data: {
          response,
          callData: {
            transcript: callData.transcript,
            status: callData.call_status,
            duration:
              callData.end_timestamp && callData.start_timestamp
                ? Math.floor(
                    (new Date(callData.end_timestamp).getTime() -
                      new Date(callData.start_timestamp).getTime()) /
                      1000,
                  )
                : undefined,
            ...(callData.call_status === 'error' && {
              error: {
                disconnection_reason:
                  callData.disconnection_reason || 'Unknown error',
                start_timestamp: callData.start_timestamp || null,
                end_timestamp: callData.end_timestamp || null,
              },
            }),
          },
        },
      };
    } catch (error) {
      return {
        success: true,
        data: {
          response,
          analytics: null,
        },
      };
    }
  }

  @Post('update-response')
  @UseGuards(JwtAuthGuard)
  @Public()
  async updateResponse(@Body() dto: GenerateInsightsDto) {
    const responses = await this.responseService.getAllResponsesBySessionId(
      dto.sessionId,
    );
    const session = await this.mockInterviewService.getSession(dto.sessionId);
    const callSummaries = responses
      .filter((r) => r.analytics)
      .map((r) => ({
        email: r.email,
        analytics: r.analytics,
        transcript: r.transcript,
      }));

    const prompt = `
    Analyze the following interview session and generate comprehensive insights.
    
    Interview Details:
    - Job Description: ${session?.jobDescription || 'Not provided'}
    - Custom Prompt: ${session?.customPrompt || 'Not provided'}
    - Difficulty: ${session?.configuration.difficulty}
    - Focus Areas: ${session?.configuration.focusAreas.join(', ') || 'General'}
    
    Call Summaries:
    ${JSON.stringify(callSummaries, null, 2)}
    
    Generate insights including:
    1. Overall performance trends
    2. Common strengths across candidates
    3. Common weaknesses across candidates
    4. Recommendations for improvement
    5. Key learning points
    
    Return as JSON:
    {
      "overallTrends": "string",
      "commonStrengths": ["string"],
      "commonWeaknesses": ["string"],
      "recommendations": ["string"],
      "keyLearnings": ["string"]
    }
        `.trim();

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert interview analyst. Analyze interview sessions and provide comprehensive insights. Return ONLY valid JSON.',
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
        throw new BadRequestException('No insights content received');
      }

      const cleanedInsights = content
        .replace(/^```(json\s*)?/i, '')
        .replace(/```$/i, '')
        .trim();

      const insightsData = JSON.parse(cleanedInsights);

      // Update session with insights
      await this.mockInterviewService.updateSessionResults(dto.sessionId, {
        ...(session?.results || {}),
        insights: insightsData as InterviewResults['insights'],
      } as InterviewResults);
      return {
        success: true,
        data: insightsData,
      };
    } catch (error) {
      this.logger.error('Error generating insights:', error);
      throw new BadRequestException('Failed to generate insights');
    }
  }

  @Post('analyze-communication')
  @UseGuards(JwtAuthGuard)
  async analyzeCommunication(@Body() dto: AnalyzeCommunicationDto) {
    const prompt = `
Analyze the following interview transcript for communication skills.

Transcript:
"""
${dto.transcript}
"""

Evaluate:
1. Clarity and articulation
2. Structure and organization
3. Pacing and flow
4. Professional tone
5. Active listening indicators
6. Non-verbal communication cues (if available)

Return as JSON:
{
  "clarityScore": number (0-100),
  "structureScore": number (0-100),
  "pacingScore": number (0-100),
  "toneScore": number (0-100),
  "overallCommunicationScore": number (0-100),
  "strengths": ["string"],
  "weaknesses": ["string"],
  "recommendations": ["string"]
}
    `.trim();

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert communication analyst. Analyze interview transcripts for communication skills. Return ONLY valid JSON.',
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
        throw new BadRequestException('No analysis content received');
      }

      const cleanedAnalysis = content
        .replace(/^```(json\s*)?/i, '')
        .replace(/```$/i, '')
        .trim();

      const analysisData = JSON.parse(cleanedAnalysis);

      return {
        success: true,
        data: analysisData,
      };
    } catch (error) {
      this.logger.error('Error analyzing communication:', error);
      throw new BadRequestException('Failed to analyze communication');
    }
  }
}
