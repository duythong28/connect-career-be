import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IntentDetectorService } from '../infrastructure/orchestration/intent-detector.service';
import { AgentRouterService } from '../infrastructure/orchestration/agent-router.service';
import { ResponseSynthesizerService } from '../infrastructure/orchestration/response-synthesizer.service';
import { ExecutionContext } from '../infrastructure/orchestration/execution-context';
import { ChatResponseDto } from '../apis/dtos/chat-response.dto';
import { EpisodicMemoryService } from '../infrastructure/memory/episodic-memory.service';
import { SemanticMemoryService } from '../infrastructure/memory/semantic-memory.service';
import { ProceduralMemoryService } from '../infrastructure/memory/procedural-memory.service';
import { SessionRepository } from '../domain/repositories/session.repository';
import { MessageRepository } from '../domain/repositories/message.repository';
import { AttachmentRepository } from '../domain/repositories/attachment.repository';
import { LangSmithService } from './langsmith.service';
import { MediaService, MediaProcessingResult } from './media.service';
import { MediaAttachmentDto } from '../apis/dtos/media-attachment.dto';
import { EventType } from '../domain/enums/event-type.enum';
import { GraphBuilderService } from '../infrastructure/orchestration/graph-builder.service';
import { AgentState } from '../domain/types/agent-state.type';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { ChatMessage, ErrorType } from '../apis/dtos/stream-chat-response.dto';
import { Repository } from 'typeorm';
import { CandidateProfile } from 'src/modules/profile/domain/entities/candidate-profile.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/modules/identity/domain/entities/user.entity';
import { ConfigService } from '@nestjs/config';

/**
 * LangGraph event structure (simplified)
 */
interface LangGraphEvent {
  event?: string;
  name?: string;
  data?: {
    chunk?: {
      content?: string;
    };
    output?: AgentState;
  };
}

/**
 * Dual Message Handler for streaming vs persistence
 * Implements the dual message pattern from architecture:
 * - Streaming messages prioritize responsiveness (replace semantics)
 * - Internal messages guarantee consistency (append semantics)
 */
class DualMessageHandler {
  private yieldThinkMessage: ChatMessage | null = null;
  private thinkMessage: ChatMessage | null = null;
  private yieldAnswerMessage: ChatMessage | null = null;
  private answerMessage: ChatMessage | null = null;
  private processedNodes = new Set<string>();

  updateStreamingThinkMessage(content: string, nodeName: string) {
    // Only emit once per node to avoid redundancy
    if (!this.processedNodes.has(nodeName)) {
      this.yieldThinkMessage = {
        role: 'assistant',
        content,
        metadata: { isThinking: true, nodeName },
      };
      this.processedNodes.add(nodeName);
    }
  }

  updatePersistedThinkMessage(content: string) {
    this.thinkMessage = {
      role: 'assistant',
      content: (this.thinkMessage?.content || '') + content,
      metadata: { ...this.thinkMessage?.metadata, isThinking: true },
    };
  }

  updateStreamingAnswerMessage(content: string) {
    // Replace content for real-time streaming
    this.yieldAnswerMessage = {
      role: 'assistant',
      content,
      metadata: { isThinking: false },
    };
  }

  updatePersistedAnswerMessage(content: string) {
    // Append content for final state
    this.answerMessage = {
      role: 'assistant',
      content: (this.answerMessage?.content || '') + content,
      metadata: { ...this.answerMessage?.metadata, isThinking: false },
    };
  }

  getStreamingMessages(): ChatMessage[] {
    const messages: ChatMessage[] = [];
    if (this.yieldThinkMessage) messages.push(this.yieldThinkMessage);
    if (this.yieldAnswerMessage) messages.push(this.yieldAnswerMessage);
    return messages;
  }

  getPersistedMessages(): ChatMessage[] {
    const messages: ChatMessage[] = [];
    if (this.thinkMessage) messages.push(this.thinkMessage);
    if (this.answerMessage) messages.push(this.answerMessage);
    return messages;
  }

  getFinalAnswer(): string {
    return (
      this.answerMessage?.content || this.yieldAnswerMessage?.content || ''
    );
  }
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly intentDetector: IntentDetectorService,
    private readonly agentRouter: AgentRouterService,
    private readonly responseSynthesizer: ResponseSynthesizerService,
    private readonly episodicMemory: EpisodicMemoryService,
    private readonly semanticMemory: SemanticMemoryService,
    private readonly proceduralMemory: ProceduralMemoryService,
    private readonly sessionRepository: SessionRepository,
    private readonly messageRepository: MessageRepository,
    private readonly attachmentRepository: AttachmentRepository,
    private readonly langSmithService: LangSmithService,
    private readonly mediaService: MediaService,
    private readonly graphBuilder: GraphBuilderService,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(CandidateProfile)
    private readonly candidateProfileRepository: Repository<CandidateProfile>,
  ) {}

  async createChat(userId: string): Promise<{ sessionId: string }> {
    const session = await this.sessionRepository.create({
      userId,
      metadata: {},
    });

    await this.episodicMemory.storeEvent(userId, {
      type: EventType.CHAT_SESSION_CREATED,
      sessionId: session.id,
      timestamp: new Date(),
    });

    return { sessionId: session.id };
  }

  async processMessage(
    userId: string,
    sessionId: string,
    message: string,
    metadata?: Record<string, any>,
  ): Promise<ChatResponseDto> {
    const startTime = Date.now();

    try {
      // Verify session exists and belongs to user
      const session = await this.sessionRepository.findById(sessionId);
      if (!session) {
        throw new NotFoundException(`Session ${sessionId} not found`);
      }
      if (session.userId !== userId) {
        throw new NotFoundException(
          'Unauthorized: Session does not belong to user',
        );
      }

      // Create execution context
      const context = new ExecutionContext(userId, sessionId, {
        episodic: this.episodicMemory,
        semantic: this.semanticMemory,
        procedural: this.proceduralMemory,
      });

      // Load conversation history from messages
      const messages = await this.messageRepository.findBySessionId(sessionId);
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Add conversation history to context
      conversationHistory.forEach((msg) => {
        context.addMessage(msg.role, msg.content);
      });

      // Process media attachments if provided
      const mediaResults: MediaProcessingResult[] = [];
      if (
        metadata?.attachments &&
        Array.isArray(metadata.attachments) &&
        metadata.attachments.length > 0
      ) {
        for (const attachment of metadata.attachments) {
          try {
            if (
              attachment &&
              typeof attachment === 'object' &&
              'name' in attachment &&
              'sourceType' in attachment
            ) {
              const result = await this.processAttachment(
                attachment as MediaAttachmentDto,
                userId,
                sessionId,
                metadata,
              );
              mediaResults.push(result);
            }
          } catch (error) {
            const attachmentName =
              attachment &&
              typeof attachment === 'object' &&
              'name' in attachment
                ? String((attachment as { name: unknown }).name)
                : 'unknown';
            this.logger.error(
              `Failed to process attachment: ${attachmentName}`,
              error,
            );
          }
        }
      }

      // Enrich message with media context
      const enrichedMessage =
        message || (mediaResults.length > 0 ? 'Processing media files...' : '');
      const enrichedMetadata: Record<string, unknown> = {
        ...metadata,
        attachments: metadata?.attachments as unknown,
        mediaResults,
        hasMedia: mediaResults.length > 0,
      };

      // Add current user message
      context.addMessage('user', enrichedMessage, enrichedMetadata);

      // Store user message
      await this.episodicMemory.storeEvent(userId, {
        type: EventType.USER_MESSAGE,
        sessionId,
        content: enrichedMessage,
        timestamp: new Date(),
      });

      // Persist user message to database
      const userMessage = await this.messageRepository.create({
        sessionId,
        content: enrichedMessage,
        role: 'user',
        metadata: enrichedMetadata,
      });

      // Create attachment entities if attachments exist
      if (metadata?.attachments && Array.isArray(metadata.attachments)) {
        await this.createAttachmentsForMessage(
          userMessage.id,
          metadata.attachments as MediaAttachmentDto[],
          userId,
          sessionId,
        );
      }

      // Detect intent
      const intentResult = await this.intentDetector.detectIntent(
        enrichedMessage,
        context.conversationHistory.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        enrichedMetadata,
      );

      context.currentIntent = intentResult.intent;
      context.entities = intentResult.entities;

      // Route to appropriate agent
      const agent = await this.agentRouter.routeToAgent(
        intentResult.intent,
        context.toAgentContext(),
      );

      // Execute agent
      const agentResult = await agent.execute(context.toAgentContext());

      // Synthesize response
      const response = await this.responseSynthesizer.synthesize(
        [agentResult],
        context,
      );

      const executionTime = Date.now() - startTime;

      // Log to LangSmith
      const langSmithRunId = await this.langSmithService.logAgentExecution({
        sessionId,
        userId,
        agentName: agent.name,
        input: {
          message: enrichedMessage,
          intent: intentResult.intent,
          entities: intentResult.entities,
        },
        output: agentResult,
        metadata: {
          executionTime,
          intent: intentResult.intent,
          entities: intentResult.entities,
          confidence: intentResult.confidence,
        },
      });

      // Add assistant response to context
      context.addMessage('assistant', response);

      // Store assistant message in episodic memory
      await this.episodicMemory.storeEvent(userId, {
        type: EventType.ASSISTANT_MESSAGE,
        sessionId,
        content: response,
        timestamp: new Date(),
      });

      // Persist assistant message with all metadata
      const assistantMessage = await this.messageRepository.create({
        sessionId,
        content: response,
        role: 'assistant',
        metadata: {
          intent: intentResult.intent,
          intentConfidence: intentResult.confidence,
          entities: intentResult.entities,
          agentName: agent.name,
          agentExecutionId: langSmithRunId || undefined,
          executionTime,
          executionSuccess: agentResult.success,
          executionResult: agentResult.data as unknown,
          executionErrors: agentResult.errors as unknown as any[] | undefined,
          ...enrichedMetadata,
        },
      });

      // Update session updatedAt
      await this.sessionRepository.update(sessionId, {
        updatedAt: new Date(),
      });

      // Store in memory
      await context.updateMemory('episodic', {
        intent: intentResult.intent,
        message: enrichedMessage,
        response,
        timestamp: new Date(),
      });

      return {
        message: response,
        sessionId,
        intent: intentResult.intent,
        entities: intentResult.entities,
        suggestions: agentResult.nextSteps,
        agent: agent.name,
        metadata: assistantMessage.metadata,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process message: ${error}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async *processMessageStream(
    userId: string,
    sessionId: string,
    message: string,
    metadata?: Record<string, any>,
    manualRetryAttempts: number = 0,
    retriedMessageId?: string,
  ): AsyncGenerator<{ type: string; data: any }, void, unknown> {
    const startTime = Date.now();
    let isError = false;
    let userMessage: { id: string } | null = null;
    let assistantMessageId: string | null = null;
    const dualMessageHandler = new DualMessageHandler();
    const maxRetries = 3;

    // Node name to progress message mapping
    const nodeProgressMessages: Record<string, string> = {
      INTENT_ROUTER: 'Understanding your request...',
      ROLE_DETECTOR: 'Detecting user role...',
      CONTEXT_ANALYZER: 'Analyzing context...',
      SYNC: 'Synchronizing data...',
      CANDIDATE_SUBGRAPH: 'Processing candidate request...',
      RECRUITER_SUBGRAPH: 'Processing recruiter request...',
      AGENT_ROUTER: 'Routing to appropriate agent...',
      CONTEXT_BUILDER: 'Building context...',
      ANSWER: 'Generating response...',
    };

    try {
      // ========================================================================
      // Phase 1: Initialization
      // ========================================================================
      const session = await this.sessionRepository.findById(sessionId);
      if (!session || session.userId !== userId) {
        throw new NotFoundException('Session not found or unauthorized');
      }

      // Process media attachments
      const mediaResults: MediaProcessingResult[] = [];
      if (
        metadata?.attachments &&
        Array.isArray(metadata.attachments) &&
        metadata.attachments.length > 0
      ) {
        for (const attachment of metadata.attachments) {
          try {
            if (
              attachment &&
              typeof attachment === 'object' &&
              'name' in attachment &&
              'sourceType' in attachment
            ) {
              const result = await this.processAttachment(
                attachment as MediaAttachmentDto,
                userId,
                sessionId,
                metadata,
              );
              mediaResults.push(result);
            }
          } catch (error) {
            const attachmentName =
              attachment &&
              typeof attachment === 'object' &&
              'name' in attachment
                ? String((attachment as { name: unknown }).name)
                : 'unknown';
            this.logger.error(
              `Failed to process attachment: ${attachmentName}`,
              error,
            );
          }
        }
      }

      const enrichedMessage =
        message || (mediaResults.length > 0 ? 'Processing media files...' : '');
      const enrichedMetadata: Record<string, unknown> = {
        ...metadata,
        attachments: metadata?.attachments as unknown,
        mediaResults,
        hasMedia: mediaResults.length > 0,
        manualRetryAttempts,
        retriedMessageId,
      };

      // Store user message
      await this.episodicMemory.storeEvent(userId, {
        type: EventType.USER_MESSAGE,
        sessionId,
        content: enrichedMessage,
        timestamp: new Date(),
      });

      userMessage = await this.messageRepository.create({
        sessionId,
        content: enrichedMessage,
        role: 'user',
        metadata: enrichedMetadata,
      });

      // Create attachment entities if attachments exist
      if (metadata?.attachments && Array.isArray(metadata.attachments)) {
        await this.createAttachmentsForMessage(
          userMessage.id,
          metadata.attachments as MediaAttachmentDto[],
          userId,
          sessionId,
        );
      }

      // ========================================================================
      // Phase 2: Immediate Feedback
      // ========================================================================
      // Stream immediate thinking message for responsiveness
      yield {
        type: 'thinking',
        data: {
          messages: {
            role: 'assistant',
            content: 'Analyzing your request...',
            metadata: { isThinking: true },
          },
          isDone: false,
          isError: false,
        },
      };

      // ========================================================================
      // Phase 3: Agent State Setup
      // ========================================================================
      // Load conversation history
      const messages = await this.messageRepository.findBySessionId(sessionId);
      const conversationHistory = messages.map((msg) =>
        msg.role === 'user'
          ? new HumanMessage(msg.content)
          : new AIMessage(msg.content),
      );

      this.logSummary(
        'Conversation history',
        conversationHistory.length > 0
          ? {
              count: conversationHistory.length,
              lastMessage: conversationHistory[conversationHistory.length - 1],
            }
          : 'empty',
      );

      // Get user profile (if available)
      const userProfile = await this.getUserProfile(userId);

      this.logSummary('User profile', userProfile);

      // Initialize agent state
      const initialState: Partial<AgentState> = {
        messages: [...conversationHistory, new HumanMessage(enrichedMessage)],
        thread_id: sessionId,
        user_profile: userProfile,
        context_data: enrichedMetadata,
      };

      this.logSummary('Initial state', {
        messageCount: initialState.messages?.length || 0,
        threadId: initialState.thread_id,
        hasUserProfile: !!initialState.user_profile,
        contextKeys: Object.keys(initialState.context_data || {}),
      });

      // Get checkpointer and build graph
      const checkpointer = await this.graphBuilder.getCheckpointer();

      this.logger.log('Checkpointer: initialized');
      const graph = this.graphBuilder.buildGraph(checkpointer);

      // Stream events from LangGraph
      const config = {
        configurable: {
          thread_id: sessionId,
        },
        metadata: {
          thread_id: sessionId,
          session_id: sessionId,
          user_id: userId,
        },
      };

      this.logger.log('Graph created with streamEvents method');
      this.logger.log('Graph keys:', Object.keys(graph));
      // ========================================================================
      // Phase 4: LangGraph Event Streaming
      // ========================================================================
      let suggestions: string[] = [];
      let analysisResult: any = null;
      let intent: string | undefined;
      let entities: Record<string, any> | undefined;
      let agentResult: any = null;

      try {
        const stream = graph.streamEvents(initialState as any, {
          version: 'v2',
          ...config,
        });

        this.logger.log('Stream created, starting event processing');
        this.logger.log('Stream keys:', Object.keys(stream));
        for await (const event of stream) {
          const langGraphEvent = event as LangGraphEvent;
          const eventType = langGraphEvent.event;
          const eventName = langGraphEvent.name;

          // ====================================================================
          // 7.1 Node Lifecycle Events (Reasoning Updates)
          // ====================================================================
          if (eventType === 'on_chain_start' && eventName) {
            this.logger.log('Node lifecycle event:', eventName);
            const progressMessage =
              nodeProgressMessages[eventName] || `Processing ${eventName}...`;

            dualMessageHandler.updateStreamingThinkMessage(
              progressMessage,
              eventName,
            );
            dualMessageHandler.updatePersistedThinkMessage(progressMessage);

            // Stream thinking update
            const streamingMessages = dualMessageHandler.getStreamingMessages();
            if (streamingMessages.length > 0) {
              yield {
                type: 'chunk',
                data: {
                  messages: streamingMessages,
                  isDone: false,
                  isError: false,
                },
              };
            }
          }

          // ====================================================================
          // 7.2 AI Response Streaming
          // ====================================================================
          if (
            eventName === 'ANSWER' &&
            eventType === 'on_chat_model_stream' &&
            langGraphEvent.data?.chunk
          ) {
            this.logger.log('AI response streaming event:', eventName);
            const chunk = langGraphEvent.data.chunk;
            if (chunk.content) {
              // Update streaming message (replace for real-time)
              const currentContent = dualMessageHandler.getFinalAnswer();
              dualMessageHandler.updateStreamingAnswerMessage(
                currentContent + chunk.content,
              );
              // Update persisted message (append for final state)
              dualMessageHandler.updatePersistedAnswerMessage(chunk.content);

              // Stream token chunk
              yield {
                type: 'chunk',
                data: {
                  messages: dualMessageHandler.getStreamingMessages(),
                  isDone: false,
                  isError: false,
                },
              };
            }
          }

          // ====================================================================
          // Handle Tool Calls (Suggestions)
          // ====================================================================
          if (eventType === 'on_tool_start' || eventType === 'on_tool_end') {
            this.logger.log('Tool call event:', eventName);
            if (
              eventName === 'suggest_prompts' &&
              eventType === 'on_tool_end'
            ) {
              try {
                const toolResult = langGraphEvent.data?.output;
                if (toolResult) {
                  suggestions = Array.isArray(toolResult)
                    ? toolResult
                    : typeof toolResult === 'string'
                      ? this.parseSuggestionsFromText(toolResult)
                      : [];

                  // Stream suggestions immediately
                  yield {
                    type: 'suggestions',
                    data: {
                      messages: {
                        role: 'assistant',
                        content: '',
                        metadata: {
                          suggestions,
                          groupSuggestionId: `suggestions_${sessionId}_${Date.now()}`,
                        },
                      },
                      isDone: false,
                      isError: false,
                    },
                  };
                }
              } catch (error) {
                this.logger.warn(
                  'Failed to parse suggestions from tool call',
                  error,
                );
              }
            }
          }

          // ====================================================================
          // Handle Final State
          // ====================================================================
          if (eventType === 'on_chain_end' && eventName === 'AGENT_RESULT') {
            agentResult = langGraphEvent.data?.output;
            this.logger.log('Captured agent result', {
              success: agentResult?.success,
              hasJobs: !!agentResult?.data?.jobs,
              jobCount: agentResult?.data?.jobs?.length || 0,
              nextSteps: agentResult?.nextSteps?.length || 0,
            });

            // Extract suggestions from agent result's nextSteps
            if (
              agentResult?.nextSteps &&
              Array.isArray(agentResult.nextSteps) &&
              agentResult.nextSteps.length > 0
            ) {
              suggestions = agentResult.nextSteps;
              this.logger.log(
                `Extracted ${suggestions.length} suggestions from agent result`,
              );

              // Stream suggestions immediately
              yield {
                type: 'suggestions',
                data: {
                  messages: {
                    role: 'assistant',
                    content: '',
                    metadata: {
                      suggestions,
                      groupSuggestionId: `suggestions_${sessionId}_${Date.now()}`,
                    },
                  },
                  isDone: false,
                  isError: false,
                },
              };
            }
          }
          if (eventType === 'on_chain_end' && eventName === 'LangGraph') {
            const finalState = langGraphEvent.data?.output as AgentState;
            this.logSummary('Final state', {
              messageCount: finalState?.messages?.length || 0,
              lastMessage:
                finalState?.messages?.[finalState.messages.length - 1],
              threadId: finalState?.thread_id,
            });

            if (finalState?.messages && finalState.messages.length > 0) {
              const lastMessage =
                finalState.messages[finalState.messages.length - 1];
              if (lastMessage instanceof AIMessage) {
                const content = lastMessage.content;
                const finalContent =
                  typeof content === 'string'
                    ? content
                    : JSON.stringify(content) || '';

                // Ensure final content is set
                if (finalContent && !dualMessageHandler.getFinalAnswer()) {
                  dualMessageHandler.updatePersistedAnswerMessage(finalContent);
                }
              }
            }

            // Extract analysis results
            if (finalState?.analysis_result) {
              analysisResult = finalState.analysis_result;
            }
            if (finalState?.intent) {
              intent = finalState.intent;
            }
            // Extract entities from state if available
            if (finalState?.context_data?.entities) {
              entities = finalState.context_data.entities;
            }
          }
        }
      } catch (streamError) {
        this.logger.error('streamEvents failed', streamError);
        throw streamError;
      }

      const executionTime = Date.now() - startTime;
      const finalResponse = dualMessageHandler.getFinalAnswer();

      // ========================================================================
      // Phase 5: Persistence (Asynchronous, Non-blocking)
      // ========================================================================
      // Store assistant message in episodic memory
      await this.episodicMemory.storeEvent(userId, {
        type: EventType.ASSISTANT_MESSAGE,
        sessionId,
        content: finalResponse,
        timestamp: new Date(),
      });

      // Persist assistant message with all metadata
      const assistantMessage = await this.messageRepository.create({
        sessionId,
        content: finalResponse,
        role: 'assistant',
        metadata: {
          executionTime,
          intent,
          entities,
          analysisResult,
          suggestions: suggestions.length > 0 ? suggestions : undefined,
          groupSuggestionId:
            suggestions.length > 0
              ? `suggestions_${sessionId}_${Date.now()}`
              : undefined,
          ...enrichedMetadata,
        },
      });

      assistantMessageId = assistantMessage.id;

      // Update session
      await this.sessionRepository.update(sessionId, {
        updatedAt: new Date(),
      });

      // ========================================================================
      // Send Completion Event
      // ========================================================================
      yield {
        type: 'complete',
        data: {
          messages: {
            role: 'assistant',
            content: finalResponse,
            metadata: {
              intent,
              entities,
              suggestions: suggestions.length > 0 ? suggestions : undefined,
              executionTime,
              jobs: agentResult?.data?.jobs
                ? agentResult.data.jobs.map((job: any) => {
                    const frontendUrl =
                      this.configService.get<string>('FRONTEND_URL') ||
                      'https://connect-career.vercel.app';

                    // Extract job ID - check multiple possible locations
                    const jobId = job.id || job.metadata?.id || job.jobId;

                    // Determine the job URL - prefer applyLink, then sourceUrl, otherwise construct from id
                    let jobUrl: string | undefined;
                    if (job.applyLink) {
                      jobUrl = job.applyLink;
                    } else if (job.sourceUrl) {
                      jobUrl = job.sourceUrl;
                    } else if (jobId) {
                      jobUrl = `${frontendUrl}/jobs/${jobId}`;
                    }

                    // Extract company name from multiple possible locations
                    const companyName =
                      job.company ||
                      job.companyName ||
                      job.metadata?.company ||
                      job.metadata?.companyName;

                    return {
                      id: jobId,
                      title: job.title || job.name || 'Untitled Job',
                      company: companyName,
                      location:
                        job.location ||
                        job.metadata?.location ||
                        'Not specified',
                      source: job._source || job.source || 'unknown',
                      score: job._score || job.score || 0,
                      url: jobUrl, // Always include url field, even if undefined
                      ...(job.salaryRange && { salaryRange: job.salaryRange }),
                      ...(job.postedDate && { postedDate: job.postedDate }),
                    };
                  })
                : undefined,
              jobSources: agentResult?.data?.sources
                ? {
                    rag: {
                      count: agentResult.data.sources.rag?.count || 0,
                    },
                    searchTool: {
                      count: agentResult.data.sources.searchTool?.count || 0,
                      totalAvailable:
                        agentResult.data.sources.searchTool?.totalAvailable,
                    },
                  }
                : undefined,
              totalJobsFound: agentResult?.data?.totalFound,
            },
          },
          isDone: true,
          isError: false,
          messageId: assistantMessageId,
          completedAt: new Date(),
        },
      };
    } catch (error) {
      isError = true;
      this.logger.error(
        `Failed to process message stream: ${error}`,
        error instanceof Error ? error.stack : undefined,
      );

      // ========================================================================
      // Error Handling & Retry Control
      // ========================================================================
      const errorType = this.classifyError(error as Error);
      const needsRetry =
        errorType === ErrorType.SYSTEM_ERROR &&
        manualRetryAttempts < maxRetries;
      const reachRetryAttemptLimit = manualRetryAttempts >= maxRetries;

      yield {
        type: 'error',
        data: {
          messages: {
            role: 'assistant',
            content: this.getErrorMessage(
              error as Error,
              reachRetryAttemptLimit,
            ),
            metadata: {
              errorType,
              needsRetry,
              reachRetryAttemptLimit,
            },
          },
          isDone: true,
          isError: true,
          needsRetry,
          errorType,
          reachRetryAttemptLimit,
        },
      };
    } finally {
      // ========================================================================
      // Cleanup: Persist user message even on error
      // ========================================================================
      if (isError && userMessage) {
        this.logger.warn(
          `Persisting user message with error metadata for failed chat in session ${sessionId}`,
        );
      }
    }
  }

  // ========================================================================
  // Helper Methods for Error Handling
  // ========================================================================

  private classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    if (message.includes('timeout')) return ErrorType.TIMEOUT;
    if (message.includes('model') || message.includes('llm')) {
      return ErrorType.MODEL_FAILURE;
    }
    if (
      message.includes('invalid') ||
      message.includes('filter') ||
      message.includes('not found')
    ) {
      return ErrorType.DOMAIN_ERROR;
    }
    return ErrorType.SYSTEM_ERROR;
  }

  private getErrorMessage(
    error: Error,
    reachRetryAttemptLimit: boolean,
  ): string {
    if (reachRetryAttemptLimit) {
      return "I'm sorry, I've reached the maximum retry attempts. Please try again later or contact support if the issue persists.";
    }

    const errorType = this.classifyError(error);
    switch (errorType) {
      case ErrorType.TIMEOUT:
        return "I'm sorry, the request timed out. Please try again.";
      case ErrorType.MODEL_FAILURE:
        return "I'm experiencing technical difficulties. Please try again in a moment.";
      case ErrorType.DOMAIN_ERROR:
        return `I couldn't process your request: ${error.message}`;
      default:
        return 'I encountered an unexpected error. Please try again.';
    }
  }

  private parseSuggestionsFromText(text: string): string[] {
    // Fallback: parse suggestions from plain text
    const lines = text.split('\n');
    const suggestions: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      // Match numbered or bulleted items
      const match = trimmed.match(/^[•\-*\d+.]\s*(.+)$/);
      if (match && match[1]) {
        suggestions.push(match[1]);
      }
    }

    return suggestions.length > 0 ? suggestions : [];
  }

  private async getUserProfile(userId: string): Promise<Record<string, any>> {
    try {
      // Fetch basic user info
      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'firstName', 'lastName', 'fullName'],
      });

      if (!user) {
        this.logger.warn(`User not found: ${userId}`);
        return { userId };
      }

      // Build basic profile
      const profile: Record<string, any> = {
        userId: user.id,
        name:
          user.fullName ||
          `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
          undefined,
      };

      // Try to fetch candidate profile (always try, don't check role)
      try {
        // Remove 'select' when using 'relations' - TypeORM has issues with column aliases
        const candidateProfile: CandidateProfile | null =
          await this.candidateProfileRepository.findOne({
            where: { userId },
            relations: [
              'primaryIndustry',
              'workExperiences',
              'workExperiences.organization',
              'educations',
            ],
            // Remove the select array - it conflicts with relations
          });

        if (!candidateProfile) {
          this.logger.debug(`No candidate profile found for user: ${userId}`);
          return profile; // Return early if no candidate profile
        }

        // Skills
        if (candidateProfile.skills && candidateProfile.skills.length > 0) {
          profile.skills = candidateProfile.skills;
        }

        // Location
        if (candidateProfile.city || candidateProfile.country) {
          profile.location = candidateProfile.city
            ? `${candidateProfile.city}${candidateProfile.country ? `, ${candidateProfile.country}` : ''}`
            : candidateProfile.country;
        }

        // Industry
        if (candidateProfile.primaryIndustry) {
          profile.industry = candidateProfile.primaryIndustry.name;
        }

        // Work Experience
        if (
          candidateProfile.workExperiences &&
          candidateProfile.workExperiences.length > 0
        ) {
          profile.experience = candidateProfile.workExperiences
            .map((exp) => ({
              jobTitle: exp.jobTitle,
              company: exp.organization?.name || 'Unknown',
              startDate: exp.startDate,
              endDate: exp.endDate,
              isCurrent: exp.isCurrent,
              skills:
                exp.skills && exp.skills.length > 0 ? exp.skills : undefined,
            }))
            .sort((a, b) => {
              const dateA = a.isCurrent
                ? new Date()
                : a.endDate
                  ? new Date(a.endDate)
                  : new Date(0);
              const dateB = b.isCurrent
                ? new Date()
                : b.endDate
                  ? new Date(b.endDate)
                  : new Date(0);
              return dateB.getTime() - dateA.getTime();
            });

          // Current job title
          const currentJob = candidateProfile.workExperiences.find(
            (exp) => exp.isCurrent,
          );
          if (currentJob) {
            profile.currentJobTitle = currentJob.jobTitle;
          }
        }

        // Education
        if (
          candidateProfile.educations &&
          candidateProfile.educations.length > 0
        ) {
          profile.education = candidateProfile.educations
            .map((edu) => ({
              degree: edu.degreeType,
              field: edu.fieldOfStudy,
              institution: edu.institutionName,
              graduationDate: edu.graduationDate,
              isCurrent: edu.isCurrent,
            }))
            .sort((a, b) => {
              const dateA = a.graduationDate
                ? new Date(a.graduationDate)
                : new Date(0);
              const dateB = b.graduationDate
                ? new Date(b.graduationDate)
                : new Date(0);
              return dateB.getTime() - dateA.getTime();
            });
        }

        this.logger.debug(
          `Candidate profile loaded for user ${userId}: ${JSON.stringify({
            hasSkills: !!profile.skills,
            hasLocation: !!profile.location,
            hasIndustry: !!profile.industry,
            experienceCount: profile.experience?.length || 0,
            educationCount: profile.education?.length || 0,
          })}`,
        );
      } catch (error) {
        // Log the actual error to see what's happening
        this.logger.warn(
          `Failed to fetch candidate profile for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      return profile;
    } catch (error) {
      this.logger.error(
        `Failed to fetch user profile for ${userId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { userId };
    }
  }

  private async processAttachment(
    attachment: MediaAttachmentDto,
    userId: string,
    sessionId: string,
    metadata?: Record<string, any>,
  ): Promise<MediaProcessingResult> {
    // Since attachments always come with URLs, only handle URL case
    if (!attachment.url) {
      throw new Error('URL is required for attachments');
    }
    return await this.mediaService.processMediaFromUrl(
      attachment.url,
      attachment.type,
      attachment.name,
      { userId, sessionId, metadata },
    );
  }

  /**
   * Create AttachmentEntity records for a message
   * Since attachments always come with URLs, we process them and create entities
   */
  private async createAttachmentsForMessage(
    messageId: string,
    attachments: MediaAttachmentDto[],
    userId: string,
    sessionId: string,
  ): Promise<void> {
    for (const attachment of attachments) {
      try {
        // Only process if URL is provided (which should always be the case)
        if (!attachment.url) {
          this.logger.warn(
            `Attachment ${attachment.name} has no URL, skipping`,
          );
          continue;
        }

        // Process media from URL
        let processingResult: any = null;
        try {
          const result = await this.mediaService.processMediaFromUrl(
            attachment.url,
            attachment.type,
            attachment.name,
            { userId, sessionId },
          );
          processingResult = {
            success: result.success,
            extractedText: result.extractedText,
            analysis: result.analysis,
            error: result.error,
          };
        } catch (error) {
          this.logger.error(
            `Failed to process attachment ${attachment.name}:`,
            error,
          );
          processingResult = {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }

        // Create attachment entity
        await this.attachmentRepository.create({
          messageId,
          type: attachment.type,
          name: attachment.name,
          mimeType: attachment.mimeType,
          url: attachment.url,
          processingResult: processingResult,
        });
      } catch (error) {
        this.logger.error(
          `Failed to create attachment entity for ${attachment.name}:`,
          error,
        );
        // Continue with other attachments even if one fails
      }
    }
  }

  async getConversationHistory(
    userId: string,
    sessionId: string,
  ): Promise<
    Array<{
      id: string;
      role: 'user' | 'assistant' | 'system';
      content: string;
      createdAt: Date;
      metadata?: Record<string, any>;
    }>
  > {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session || session.userId !== userId) {
      throw new NotFoundException('Session not found or unauthorized');
    }

    const messages = await this.messageRepository.findBySessionId(sessionId);
    return messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      createdAt: msg.createdAt,
      metadata: msg.metadata,
    }));
  }

  async getUserChatSessions(
    userId: string,
    limit: number = 50,
  ): Promise<
    Array<{
      sessionId: string;
      title?: string;
      lastMessage?: string;
      lastMessageAt?: Date;
      messageCount: number;
      createdAt: Date;
      updatedAt: Date;
    }>
  > {
    const sessions = await this.sessionRepository.findByUserId(userId, limit);

    return sessions.map((session) => {
      const messages = session.messages || [];
      const sortedMessages = messages.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
      const lastMessage = sortedMessages[0];

      return {
        sessionId: session.id,
        title: session.title,
        lastMessage: lastMessage?.content,
        lastMessageAt: lastMessage?.createdAt,
        messageCount: messages.length,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      };
    });
  }

  async getRecentConversations(
    userId: string,
    limit: number = 20,
  ): Promise<
    Array<{
      id: string;
      sessionId: string;
      role: 'user' | 'assistant' | 'system';
      content: string;
      createdAt: Date;
      metadata?: Record<string, any>;
    }>
  > {
    const messages = await this.messageRepository.findByUserId(userId, limit);

    return messages
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map((msg) => ({
        id: msg.id,
        sessionId: msg.sessionId,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt,
        metadata: msg.metadata,
      }));
  }

  private logSummary(label: string, data: any, maxLength: number = 200): void {
    if (!data) {
      this.logger.log(`${label}: null/undefined`);
      return;
    }

    if (Array.isArray(data)) {
      this.logger.log(`${label}: Array[${data.length}]`);
      if (data.length > 0 && data.length <= 3) {
        // Log first few items if array is small
        data.slice(0, 3).forEach((item, idx) => {
          const summary = this.summarizeObject(item, maxLength);
          this.logger.debug(`${label}[${idx}]: ${summary}`);
        });
      }
      return;
    }

    if (typeof data === 'object') {
      const summary = this.summarizeObject(data, maxLength);
      this.logger.log(`${label}: ${summary}`);
      return;
    }

    // For primitives, truncate if too long
    const str = String(data);
    const truncated =
      str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
    this.logger.log(`${label}: ${truncated}`);
  }

  private summarizeObject(obj: any, maxLength: number = 200): string {
    if (!obj || typeof obj !== 'object') {
      return String(obj);
    }

    // Handle special cases
    if (obj.constructor?.name) {
      const className = obj.constructor.name;

      // For messages, just show role and content preview
      if (className.includes('Message')) {
        const role =
          obj.role ||
          (obj.constructor.name.includes('Human') ? 'user' : 'assistant');
        const content =
          typeof obj.content === 'string'
            ? obj.content.length > 100
              ? obj.content.substring(0, 100) + '...'
              : obj.content
            : '[non-string content]';
        return `${role}: ${content}`;
      }

      // For checkpointer, just show it's initialized
      if (
        className.includes('PostgresSaver') ||
        className.includes('Checkpointer')
      ) {
        return `${className} (initialized)`;
      }
    }

    // For regular objects, show key fields only
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';

    const summary: Record<string, any> = {};
    for (const key of keys.slice(0, 5)) {
      // Only first 5 keys
      const value = obj[key];
      if (Array.isArray(value)) {
        summary[key] = `Array[${value.length}]`;
      } else if (typeof value === 'object' && value !== null) {
        summary[key] = `Object(${Object.keys(value).length} keys)`;
      } else if (typeof value === 'string' && value.length > 50) {
        summary[key] = value.substring(0, 50) + '...';
      } else {
        summary[key] = value;
      }
    }

    if (keys.length > 5) {
      summary['...'] = `${keys.length - 5} more keys`;
    }

    const jsonStr = JSON.stringify(summary);
    return jsonStr.length > maxLength
      ? jsonStr.substring(0, maxLength) + '...'
      : jsonStr;
  }
}
