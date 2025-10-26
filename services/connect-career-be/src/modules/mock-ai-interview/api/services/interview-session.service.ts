// import { InjectRepository } from '@nestjs/typeorm';
// import { MockInterviewSession } from '../../domain/entities/mock_interview_sessions.entity';
// import { InterviewQuestion } from '../../domain/entities/mock_interview_questions.entity';
// import { Repository } from 'typeorm';
// import {
//   Injectable,
//   InternalServerErrorException,
//   NotFoundException,
// } from '@nestjs/common';
// import { InterviewResponse } from '../../domain/entities/mock_interview_responses.entity';
// import { AIService } from 'src/shared/infrastructure/external-services/ai/ai.service';
// import * as evaluatorAgentInterface from '../../infrastructure/interfaces/evaluator-agent.interface';
// import * as coachAgentInterface from '../../infrastructure/interfaces/coach-agent.interface';
// import { SubmitResponseDto } from '../dto/submit-response.dto';
// import {
//   InterviewResults,
//   InterviewSessionStatus,
//   ScoringDimension,
// } from '../../domain/value-objects/interview-configuration.vo';

// @Injectable()
// export class InterviewSessionService {
//   constructor(
//     @InjectRepository(MockInterviewSession)
//     private sessionRepository: Repository<MockInterviewSession>,
//     @InjectRepository(InterviewQuestion)
//     private questionRepository: Repository<InterviewQuestion>,
//     @InjectRepository(InterviewResponse)
//     private responseRepository: Repository<InterviewResponse>,
//     private aiService: AIService,
//   ) {}
//   async startSession(sessionId: string): Promise<MockInterviewSession> {
//     const session = await this.sessionRepository.findOne({
//       where: { id: sessionId },
//     });

//     if (!session) {
//       throw new NotFoundException('Session not found');
//     }

//     session.status = InterviewSessionStatus.IN_PROGRESS;
//     session.startedAt = new Date();

//     const question = await this.generateInitialQuestion(session);
//     await this.questionRepository.save(question);

//     return this.sessionRepository.save(session);
//   }
//   async submitResponse(
//     sessionId: string,
//     questionId: string,
//     dto: SubmitResponseDto,
//   ): Promise<{ nextQuestion?: InterviewQuestion; isComplete: boolean }> {
//     const response = new InterviewResponse();
//     response.sessionId = sessionId;
//     response.questionId = questionId;
//     response.textResponse = dto.textResponse;
//     response.audioUrl = dto.audioUrl;
//     response.duration = dto.duration;

//     await this.responseRepository.save(response);
//     this.evaluateResponseAsync(sessionId, questionId, response);

//     const session = await this.sessionRepository.findOne({
//       where: { id: sessionId },
//       relations: ['questions', 'responses', 'scores', 'feedback'],
//     });

//     const isComplete = this.shouldCompleteSession(session);
//     if (isComplete) {
//       await this.completeSession(sessionId);
//       return { isComplete: true };
//     } else {
//       const nextQuestion = await this.generateNextQuestion(session);
//       await this.questionRepository.save(nextQuestion);
//       return { nextQuestion, isComplete: false };
//     }
//   }
//   async completeSession(sessionId: string): Promise<InterviewResults> {
//     const session = await this.sessionRepository.findOne({
//       where: { id: sessionId },
//       relations: ['questions', 'responses', 'scores', 'feedback'],
//     });

//     session.status = InterviewSessionStatus.COMPLETED;
//     session.completedAt = new Date();

//     // Generate final results
//     const results = await this.generateFinalResults(session);
//     session.results = results;

//     await this.sessionRepository.save(session);

//     // Trigger learning integration
//     await this.integrateWithLearning(session);

//     return results;
//   }
//   private async generateInitialQuestion(
//     session: MockInterviewSession,
//   ): Promise<InterviewQuestion> {
//     const prompt = this.buildQuestionPrompt(session);
//     const questionText = await this.aiService.generate({ prompt });

//     const question = new InterviewQuestion();
//     question.sessionId = session.id;
//     question.question = questionText.content || '';
//     question.type = session.configuration.questionTypes[0];
//     question.persona = 'HR';
//     question.order = 1;
//     question.askedAt = new Date();

//     return question;
//   }

//   private buildSystemPrompt(session: MockInterviewSession): string {
//     return `
//       "You are an expert in coming up with follow up questions to uncover deeper insights.";
//     `;
//   }
//   private buildQuestionPrompt(session: MockInterviewSession): string {
//     const basePrompt = `
//       Generate an interview question based on the following information:
//       Follow these detailed guidelines when crafting the questions:
//       - Focus on evaluating the candidate's technical knowledge and their experience working on relevant projects. Questions should aim to gauge depth of expertise, problem-solving ability, and hands-on project experience. These aspects carry the most weight.
//       - Include questions designed to assess problem-solving skills through practical examples. For instance, how the candidate has tackled challenges in previous projects, and their approach to complex technical issues.
//       - Soft skills such as communication, teamwork, and adaptability should be addressed, but given less emphasis compared to technical and problem-solving abilities.
//       - Maintain a professional yet approachable tone, ensuring candidates feel comfortable while demonstrating their knowledge.
//       - Ask concise and precise open-ended questions that encourage detailed responses. Each question should be 30 words or less for clarity.

//         Use the following context to generate the questions:
//             Candidate's Goal: ${session.customPrompt}
//             Job Description: ${session.jobDescription ? `Job Description: ${session.jobDescription}` : ''}
//             Difficulty Level: ${session.configuration.difficulty}
//             Focus Areas: ${session.configuration.focusAreas.join(', ') || 'General'}
//             Question Types: ${session.configuration.questionTypes.join(', ')}
//       Moreover generate a 50 word or less second-person description about the interview to be shown to the user. It should be in the field 'description'.
//       Do not use the exact objective in the description. Remember that some details are not be shown to the user. It should be a small description for the
//       user to understand what the content of the interview would be. Make sure it is clear to the respondent who's taking the interview.
//       The field 'questions' should take the format of an array of objects with the following key: question. 
//       Strictly output only a JSON object with the keys 'questions' and 'description'`;

//     return basePrompt.trim();
//   }

//   private shouldCompleteSession(session: MockInterviewSession): boolean {
//     const questionCount = session.questions?.length || 0;
//     const maxQuestions = Math.ceil(session.configuration.duration / 5); // 5 minutes per question
//     return questionCount >= maxQuestions;
//   }

//   private async generateFinalResults(
//     session: MockInterviewSession,
//   ): Promise<InterviewResults> {
//     // Implementation for generating final results
//     // This would involve calling the evaluator and coach agents
//     return {
//       overallScore: 0,
//       dimensionScores: {
//         [ScoringDimension.CONTENT]: 0,
//         [ScoringDimension.DEPTH]: 0,
//         [ScoringDimension.COMMUNICATION]: 0,
//         [ScoringDimension.TECHNICAL_SKILLS]: 0,
//         [ScoringDimension.PROBLEM_SOLVING]: 0,
//         [ScoringDimension.LEADERSHIP]: 0,
//         [ScoringDimension.TIME_MANAGEMENT]: 0,
//         [ScoringDimension.CONFIDENCE]: 0
//       },
//       strengths: [],
//       weaknesses: [],
//       recommendation: [],
//       learningTags: [],
//       transcript: '',
//       duration: 0,
//     };
//   }

//   private async evaluateResponseAsync(
//     sessionId: string,
//     questionId: string,
//     response: InterviewResponse,
//   ): Promise<void> {
//     // Queue evaluation job for async processing
//   }

//   private async integrateWithLearning(
//     session: MockInterviewSession,
//   ): Promise<void> {
//     // Integration with learning module
//   }
// }
