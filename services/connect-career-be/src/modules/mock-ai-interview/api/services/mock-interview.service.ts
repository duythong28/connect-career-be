import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AIMockInterview } from '../../domain/entities/mock_interview_sessions.entity';
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
  QuestionContext,
  QuestionType,
} from '../../domain/value-objects/interview-configuration.vo';
import { MockInterviewSearchFilters } from '../dto/search-mock-interview.filter.dto';
import { OpenAI } from 'openai';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { CreateMockInterviewDto } from '../dto/mock-interview.dto';
import {
  GenerateMockInterviewQuestionsDto,
  GenerateSpecificAreasFromJobDescriptionDto,
} from '../dto/generate-mock-interview-question.dto';
import { QuestionInputDto } from '../dto/question-input.dto';

@Injectable()
export class MockInterviewService {
  private readonly logger = new Logger(MockInterviewService.name);
  private readonly openai: OpenAI;
  constructor(
    @InjectRepository(AIMockInterview)
    private readonly sessionRepository: Repository<AIMockInterview>,
    @InjectRepository(InterviewQuestion)
    private readonly questionRepository: Repository<InterviewQuestion>,
    @InjectRepository(InterviewResponse)
    private readonly responseRepository: Repository<InterviewResponse>,
    @InjectRepository(InterviewScore)
    private readonly scoreRepository: Repository<InterviewScore>,
    @InjectRepository(InterviewFeedback)
    private readonly feedbackRepository: Repository<InterviewFeedback>,
    private readonly configService: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      maxRetries: 5,
      dangerouslyAllowBrowser: true,
    });
  }

  async generateSpecificAreasFromJobDescription(
    dto: GenerateSpecificAreasFromJobDescriptionDto,
  ): Promise<{
    areas: string[];
  }> {
    try {
      const baseCompletion = await this.openai.chat.completions.create({
        model: 'gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert AI assistant tasked with analyzing job descriptions for a high-tech recruiting platform. Extract technical skills, tools, and high-level concepts. Return ONLY valid JSON.',
          },
          {
            role: 'user',
            content: this.buildExtractSpecificAreasFromJobDescriptionPrompt(
              dto.jobDescription ?? '',
            ),
          },
        ],
        temperature: 0.3,
      });
      const content = baseCompletion.choices[0]?.message?.content;
      if (!content || content.trim() === '') {
        throw new BadRequestException(
          'No content received from base completion.',
        );
      }
      const cleanedContent = content
        .replace(/^```(json\s*)?/i, '')
        .replace(/```$/i, '')
        .trim();
      if (!cleanedContent) {
        throw new BadRequestException(
          'Content was empty after cleaning markdown fences.',
        );
      }
      const parsedResponse = JSON.parse(cleanedContent);
      return parsedResponse as { areas: string[] };
    } catch (error) {
      this.logger.error(
        'Error generating specific areas from job description:',
        error,
      );
      throw new BadRequestException(
        'Failed to generate specific areas from job description',
      );
    }
  }

  async updateSessionResults(
    sessionId: string,
    results: InterviewResults,
  ): Promise<AIMockInterview> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Interview session not found');
    }
    session.results = results;
    session.status = InterviewSessionStatus.COMPLETED;
    session.completedAt = new Date();
    return await this.sessionRepository.save(session);
  }

  async updateSessionStatus(
    sessionId: string,
    status: InterviewSessionStatus,
  ): Promise<AIMockInterview> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Interview session not found');
    }
    session.status = status;
    if (status === InterviewSessionStatus.IN_PROGRESS && !session.startedAt) {
      session.startedAt = new Date();
    }
    return await this.sessionRepository.save(session);
  }

  async generateMockInterviewQuestion(
    dto: GenerateMockInterviewQuestionsDto,
    candidateId: string,
  ): Promise<{
    mockInterviewSession: AIMockInterview;
    questions: QuestionInputDto[];
    description: string;
  }> {
    const session = new AIMockInterview();
    session.candidateId = candidateId;
    session.customPrompt = dto.customPrompt;
    session.jobDescription = dto.jobDescription;
    session.configuration = this.buildConfiguration(dto);
    session.status = InterviewSessionStatus.CREATED;
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

      const questions: QuestionInputDto[] = [];
      const rawQuestions =
        (parsedResponse as { questions: any[] })?.questions || [];

      for (let i = 0; i < rawQuestions.length; i++) {
        const q = (
          rawQuestions as {
            question: string;
            type: string;
            persona: string;
            order: number;
            timeLimit: number;
            context: any[];
          }[]
        )[i];
        if (
          q &&
          q.question &&
          q.type &&
          q.persona &&
          typeof q.order === 'number'
        ) {
          questions.push({
            question: q.question,
            type: q.type as QuestionType,
            persona: q.persona,
            order: q.order,
            timeLimit: q.timeLimit || undefined,
            context: (q.context as QuestionContext) || undefined,
            askedAt: new Date().toISOString(),
          });
        } else {
          this.logger.warn(`Invalid question format at index ${i}:`, q);
        }
      }
      questions.sort((a, b) => a.order - b.order);

      this.logger.log('Interview questions generated successfully');
      return {
        mockInterviewSession: session,
        questions,
        description: (parsedResponse?.description as string) || '',
      };
    } catch (error) {
      this.logger.error('Error generating questions:', error);
      throw new BadRequestException('Failed to generate interview questions');
    }
  }

  async createMockInterview(
    dto: CreateMockInterviewDto,
    candidateId: string,
  ): Promise<{
    sessionId: string;
    response: string;
    callId: string;
    callUrl: string;
    readableSlug: string | null;
  }> {
    try {
      const callId = randomUUID();
      const baseUrl = this.configService.get<string>('FRONTEND_URL');
      const callUrl = baseUrl + '/mock-interview/' + callId;
      const readableSlug = this.slugify(dto.name ?? '');
      const session = this.sessionRepository.create({
        candidateId: candidateId,
        interviewerAgentId: dto.interviewerAgentId,
        customPrompt: dto.customPrompt,
        jobDescription: dto.jobDescription,
        configuration: this.buildConfiguration(
          dto as GenerateMockInterviewQuestionsDto,
        ),
        status: InterviewSessionStatus.CREATED,
      });

      await this.sessionRepository.save(session);

      if (dto.questions && dto.questions.length > 0) {
        const questionEntities = dto.questions.map((q) =>
          this.questionRepository.create({
            sessionId: session.id,
            question: q.question,
            order: q.order,
            timeLimit: q.timeLimit,
            context: q.context,
            askedAt: q.askedAt ? new Date(q.askedAt) : new Date(),
          }),
        );
        await this.questionRepository.save(questionEntities);
        this.logger.log(
          `Saved ${questionEntities.length} questions to database for session ${session.id}`,
        );
      }

      return {
        response: 'Interview created successfully',
        sessionId: session.id,
        callId,
        callUrl,
        readableSlug,
      };
    } catch (error) {
      this.logger.error('Error creating interview', { error });
      throw new InternalServerErrorException('Internal server error');
    }
  }

  async getSession(sessionId: string): Promise<AIMockInterview | null> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['questions', 'responses', 'scores', 'feedback'],
      relationLoadStrategy: 'query',
    });

    if (session?.responses && session?.responses.length > 0) {
      session.responses.sort((a, b) => {
        const dateA = a.createdAt?.getTime() || 0;
        const dateB = b.createdAt?.getTime() || 0;
        return dateB - dateA; // Descending order
      });
    }

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
  ): Promise<{ sessions: AIMockInterview[]; total: number }> {
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
      .addOrderBy('session.id', 'DESC')
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit)
      .getManyAndCount();

    return { sessions, total };
  }

  private buildConfiguration(
    dto: GenerateMockInterviewQuestionsDto,
  ): InterviewConfiguration {
    return {
      duration: dto.duration || 10,
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
  private buildQuestionPrompt(session: AIMockInterview): string {
    const hasCustomGoal =
      session.customPrompt && session.customPrompt.trim().length > 0;
    const calculateQuestionCount = () => {
      const duration = session.configuration.duration || 10; // minutes
      // Generate approximately 1 question per 2 minutes, minimum 5, maximum 15
      const calculated = Math.max(5, Math.min(15, Math.floor(duration / 2)));
      return calculated;
    };

    const totalQuestions = calculateQuestionCount();

    // Build guidelines based on whether custom goal exists
    const guidelinesSection = hasCustomGoal
      ? `
        PRIMARY FOCUS: The candidate's stated goal should be the TOP PRIORITY when generating questions.
        Candidate's Goal: ${session.customPrompt}
        
        Follow these guidelines:
        - Generate questions that directly align with and prioritize the candidate's stated goal above all else.
        - If the candidate wants to practice specific skills (e.g., behavioral questions, conflict resolution), ALL questions should focus on those areas unless explicitly requested otherwise.
        - Use the job description and focus areas to provide relevant context, but do not override the candidate's primary goal.
        - Ask concise and precise open-ended questions that encourage detailed responses. Each question should be 30 words or less for clarity.
      `
      : `
        Follow these detailed guidelines when crafting the questions:
        - Focus on evaluating the candidate's technical knowledge and their experience working on relevant projects. Questions should aim to gauge depth of expertise, problem-solving ability, and hands-on project experience. These aspects carry the most weight.
        - Include questions designed to assess problem-solving skills through practical examples. For instance, how the candidate has tackled challenges in previous projects, and their approach to complex technical issues.
        - Soft skills such as communication, teamwork, and adaptability should be addressed, but given less emphasis compared to technical and problem-solving abilities.
        - Maintain a professional yet approachable tone, ensuring candidates feel comfortable while demonstrating their knowledge.
        - Ask concise and precise open-ended questions that encourage detailed responses. Each question should be 30 words or less for clarity.
      `;

    const basePrompt = `
      Generate interview questions based on the following information:
      ${guidelinesSection}

  
      Use the following context to generate the questions:
          ${hasCustomGoal ? `Candidate's Goal (HIGHEST PRIORITY): ${session.customPrompt}` : ''}
          Job Description: ${session.jobDescription ? `${session.jobDescription}` : 'Not provided'}
          Difficulty Level: ${session.configuration.difficulty}
          Focus Areas: ${session.configuration.focusAreas.join(', ') || 'General'}

      IMPORTANT OUTPUT FORMAT:
      Generate a 50 word or less second-person description about the interview to be shown to the user in the field 'description'.
      Do not use the exact objective in the description. Remember that some details should not be shown to the user. It should be a small description for the user to understand what the content of the interview would be.

      The 'questions' field MUST be an array of objects, where each object has the following structure:
      {
        "question": "The actual question text (required)",
        "type": "One of: opener, closing, behavioral, situational, motivational, cultural_fit, process, theoretical, coding_challenge, system_design, technical, scenario, follow_up (required)",
        "persona": "The interviewer persona/character name (e.g., 'Henry', 'Marcus', or 'default') (required)",
        "order": Number indicating the sequence order starting from 1 (required),
        "timeLimit": Optional number in seconds (minimum 30) for time limit to answer,
        "context": Optional object with structure: { "previousAnswers": [], "followUpReason": "", "scenarioDetails": {} }
      }

      Rules for question types:
      - The first question should have type "opener" and order 1
      - The last question should have type "closing" and order equal to the total number of questions
      - Distribute question types evenly based on the requested types
      - Persona should be a consistent character name (use 'default' if no specific persona is needed)

      Generate ${totalQuestions} questions total (including 1 opener and 1 closing question).

      Strictly output ONLY a valid JSON object with this exact structure:
      {
        "description": "string",
        "questions": [
          {
            "question": "string",
            "type": "string (one of the valid types)",
            "persona": "string",
            "order": number,
            "timeLimit": number (optional),
            "context": {} (optional)
          }
        ]
      }`;

    return basePrompt.trim();
  }

  private buildExtractSpecificAreasFromJobDescriptionPrompt(
    jobDescription: string,
  ): string {
    return `
      Your goal is to read the provided job description and extract a comprehensive list of all relevant technical skills, tools, and high-level concepts.

      Your output should be a blend of:
      1.  **Specific Technologies:** Languages, frameworks, libraries, databases (e.g., 'Python', 'React', 'PostgreSQL').
      2.  **High-Level Concepts:** Architectural patterns, methodologies, and core CS topics (e.g., 'System Design', 'Algorithms', 'Microservices', 'DevOps').

      A perfect example of a final tag list looks like this:
      [
        "JavaScript", "React", "Python", "System Design", "Algorithms",
        "APIs", "Databases", "Testing", "Cloud", "Security", "DevOps", "Microservices"
      ]

      Guidelines:
      * Read the job description carefully.
      * Extract tags that match the style and abstraction level of the example list.
      * Do not extract soft skills (e.g., "communication", "team player").
      * Consolidate related terms where appropriate (e.g., 'AWS', 'Azure', or 'GCP' should result in a 'Cloud' tag. 'Unit testing' or 'TDD' should result in a 'Testing' tag).
      * Return your answer ONLY as a JSON object with an "areas" key containing an array of strings. Do not include any other text, explanation, or commentary.

      Job Description:
      """
      ${jobDescription}
      """

      Output Format (MUST be exactly this structure):
      {
        "areas": ["string", "string", "string", ...]
      }
    `;
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
