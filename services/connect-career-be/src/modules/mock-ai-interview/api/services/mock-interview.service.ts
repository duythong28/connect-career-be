import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MockInterviewSession } from '../../domain/entities/mock_interview_sessions.entity';
import { Repository } from 'typeorm';
import { InterviewQuestion } from '../../domain/entities/mock_interview_questions.entity';
import { InterviewResponse } from '../../domain/entities/mock_interview_responses.entity';
import { InterviewScore } from '../../domain/entities/mock_interview_scores.entity';
import { InterviewFeedback } from '../../domain/entities/mock_interview_feedback.entity';
import {
  Difficulty,
  InterviewConfiguration,
  InterviewResults,
  InterviewSessionStatus,
} from '../../domain/value-objects/interview-configuration.vo';
import { CreateMockInterviewDto } from '../dto/create-mock-interview.dto';
import { MockInterviewSearchFilters } from '../dto/search-mock-interview.filter.dto';
import { OpenAI } from 'openai';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';
import { UUID } from 'typeorm/driver/mongodb/bson.typings.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MockInterviewService {
  private readonly logger = new Logger(MockInterviewService.name);
  private readonly openai: OpenAI;
  constructor(
    @InjectRepository(MockInterviewSession)
    private readonly sessionRepository: Repository<MockInterviewSession>,
    @InjectRepository(InterviewQuestion)
    private readonly questionRepository: Repository<InterviewQuestion>,
    @InjectRepository(InterviewResponse)
    private readonly responseRepository: Repository<InterviewResponse>,
    @InjectRepository(InterviewScore)
    private readonly scoreRepository: Repository<InterviewScore>,
    @InjectRepository(InterviewFeedback)
    private readonly feedbackRepository: Repository<InterviewFeedback>,
    private readonly aiService: AIService,
    private readonly configService: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      maxRetries: 5,
      dangerouslyAllowBrowser: true,
    });
  }

  async createSession(
    dto: CreateMockInterviewDto,
    candidateId: string,
  ): Promise<{
    mockInterviewSession: MockInterviewSession;
    questions: string[];
    description: string;
  }> {
    const session = new MockInterviewSession();
    session.candidateId = candidateId;
    session.customPrompt = dto.customPrompt;
    session.jobDescription = dto.jobDescription;
    session.configuration = this.buildConfiguration(dto);
    session.status = InterviewSessionStatus.CREATED;
    await this.sessionRepository.save(session);
    try {
      const baseCompletion = await this.openai.chat.completions.create({
        model: 'gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: this.buildSystemPrompt(),
          },
          {
            role: 'user',
            content: this.buildQuestionPrompt(session),
          },
        ],
        temperature: 0.7,
      });
      const defaultResponse = {
        mockInterviewSession: session,
        questions: [],
        description: '',
      };
      const basePromptOutput = baseCompletion.choices[0] || {};
      const content = basePromptOutput.message?.content;

      if (!content || content.trim() === '') {
        this.logger.warn('No content received from base completion.');
        return defaultResponse;
      }

      const cleanedContent = content
        .replace(/^```(json\s*)?/, '')
        .replace(/```$/, '')
        .trim();

      if (!cleanedContent) {
        this.logger.warn('Content was empty after cleaning markdown fences.');
        return defaultResponse;
      }

      const parsedResponse = JSON.parse(cleanedContent);

      if (typeof parsedResponse !== 'object' || parsedResponse === null) {
        this.logger.error('Parsed JSON is not a valid object.', {
          parsedResponse,
        });
        return defaultResponse;
      }

      this.logger.log('Interview questions generated successfully');

      return {
        mockInterviewSession: session,
        questions: (parsedResponse?.questions as string[]) || [],
        description: (parsedResponse?.description as string) || '',
      };
    } catch (error) {
      this.logger.error('Error generating questions:', error);
      throw new BadRequestException('Failed to generate interview questions');
    }
  }

  async createMockInterview(
    dto: CreateMockInterviewDto & { interviewData?: { agentId: string } },
    candidateId: string,
  ): Promise<{
    response: string;
    callId: string;
    callUrl: string;
    readableSlug: string | null;
  }> {
    try {
      const callId = new UUID().toString();
      const baseUrl = this.configService.get<string>('FRONTEND_URL');
      const callUrl = baseUrl + '/mock-interview/' + callId;
      const readableSlug = this.slugify(dto.name ?? '');
      const session = this.sessionRepository.create({
        candidateId: candidateId,
        interviewerAgentId: dto.interviewData?.agentId,
        customPrompt: dto.customPrompt,
        jobDescription: dto.jobDescription,
        configuration: this.buildConfiguration(dto),
        status: InterviewSessionStatus.CREATED,
      });

      await this.sessionRepository.save(session);

      this.logger.log('Interview created successfully', {
        sessionId: session.id,
      });

      return {
        response: 'Interview created successfully',
        callId,
        callUrl,
        readableSlug,
      };
    } catch (error) {
      this.logger.error('Error creating interview', { error });
      throw new InternalServerErrorException('Internal server error');
    }
  }

  async getSession(sessionId: string): Promise<MockInterviewSession | null> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['questions', 'responses', 'scores', 'feedback'],
    });

    if (!session) {
      throw new NotFoundException('Interview session not found');
    }
    return session;
  }

  async getResults(sessionId: string): Promise<InterviewResults | null> {
    const session = await this.getSession(sessionId);
    if (!session?.results) {
      throw new BadRequestException('Interview not completed yet');
    }
    return session.results;
  }

  async getMySessions(
    candidateId: string,
    filters: MockInterviewSearchFilters & { page: number; limit: number },
  ): Promise<{ sessions: MockInterviewSession[]; total: number }> {
    const queryBuilder = this.sessionRepository
      .createQueryBuilder('session')
      .where('session.candidateId = :candidateId', { candidateId });

    if (filters.status) {
      queryBuilder.andWhere('session.status = :status', {
        status: filters.status,
      });
    }

    if (filters.role) {
      queryBuilder.andWhere('session.role = :role', { role: filters.role });
    }

    if (filters.scenario) {
      queryBuilder.andWhere('session.scenario = :scenario', {
        scenario: filters.scenario,
      });
    }

    const [sessions, total] = await queryBuilder
      .orderBy('session.createdAt', 'DESC')
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit)
      .getManyAndCount();

    return { sessions, total };
  }

  private buildConfiguration(
    dto: CreateMockInterviewDto,
  ): InterviewConfiguration {
    return {
      duration: dto.duration || 10,
      questionTypes: dto.questionTypes,
      focusAreas: dto.focusAreas || [],
      difficulty: dto.difficulty ?? Difficulty.INTERMEDIATE,
      audioEnabled: dto.audioEnabled || false,
      realtimeScoring: dto.realtimeScoring || false,
    };
  }

  private buildSystemPrompt(): string {
    return `
      "You are an expert in coming up with follow up questions to uncover deeper insights.";
    `;
  }

  private buildQuestionPrompt(session: MockInterviewSession): string {
    const basePrompt = `
      Generate an interview question based on the following information:
      Follow these detailed guidelines when crafting the questions:
      - Focus on evaluating the candidate's technical knowledge and their experience working on relevant projects. Questions should aim to gauge depth of expertise, problem-solving ability, and hands-on project experience. These aspects carry the most weight.
      - Include questions designed to assess problem-solving skills through practical examples. For instance, how the candidate has tackled challenges in previous projects, and their approach to complex technical issues.
      - Soft skills such as communication, teamwork, and adaptability should be addressed, but given less emphasis compared to technical and problem-solving abilities.
      - Maintain a professional yet approachable tone, ensuring candidates feel comfortable while demonstrating their knowledge.
      - Ask concise and precise open-ended questions that encourage detailed responses. Each question should be 30 words or less for clarity.

        Use the following context to generate the questions:
            Candidate's Goal: ${session.customPrompt}
            Job Description: ${session.jobDescription ? `Job Description: ${session.jobDescription}` : ''}
            Difficulty Level: ${session.configuration.difficulty}
            Focus Areas: ${session.configuration.focusAreas.join(', ') || 'General'}
            Question Types: ${session.configuration.questionTypes.join(', ')}
      Moreover generate a 50 word or less second-person description about the interview to be shown to the user. It should be in the field 'description'.
      Do not use the exact objective in the description. Remember that some details are not be shown to the user. It should be a small description for the
      user to understand what the content of the interview would be. Make sure it is clear to the respondent who's taking the interview.
      The field 'questions' should take the format of an array of objects with the following key: question. 
      Strictly output only a JSON object with the keys 'questions' and 'description'`;

    return basePrompt.trim();
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }
}
