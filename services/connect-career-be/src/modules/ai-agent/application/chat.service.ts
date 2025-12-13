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
import {
  MediaAttachmentDto,
} from '../apis/dtos/media-attachment.dto';
import { EventType } from '../domain/enums/event-type.enum';
import { GraphBuilderService } from '../infrastructure/orchestration/graph-builder.service';
import { AgentState } from '../domain/types/agent-state.type';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

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
  ): AsyncGenerator<{ type: string; data: any }, void, unknown> {
    const startTime = Date.now();
    let isError = false;
    let userMessage: { id: string } | null = null;
    let fullResponse = '';

    try {
      // Verify session
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

      // Load conversation history
      const messages = await this.messageRepository.findBySessionId(sessionId);
      const conversationHistory = messages.map((msg) => new (msg.role === 'user' ? HumanMessage : AIMessage)(msg.content));

      // Get user profile (if available)
      const userProfile = await this.getUserProfile(userId);

      // Initialize agent state
      const initialState: Partial<AgentState> = {
        messages: [...conversationHistory, new HumanMessage(enrichedMessage)],
        thread_id: sessionId,
        user_profile: userProfile,
        context_data: enrichedMetadata,
      };

      // Get checkpointer and build graph
      const checkpointer = await this.graphBuilder.getCheckpointer();
      const graph = await this.graphBuilder.buildGraph(checkpointer);

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

      // Stream events (simplified handling)
      try {
        const stream = graph.streamEvents(initialState as any, { version: 'v2', ...config });
        for await (const event of stream) {
          const eventType = (event as any).event;
          const eventName = (event as any).name;

          // Emit basic thinking signals
          if (eventType === 'on_chain_start') {
            yield { type: 'chunk', data: { content: '', isThinking: eventName !== 'ANSWER' } };
          }

          // Handle streaming LLM responses
          if (
            eventName === 'ANSWER' &&
            eventType === 'on_chat_model_stream' &&
            (event as any).data?.chunk
          ) {
            const chunk = (event as any).data.chunk;
            if (chunk.content) {
              fullResponse += chunk.content;
              yield { type: 'chunk', data: { content: chunk.content, isThinking: false } };
            }
          }

          // Handle final state
          if (eventType === 'on_chain_end' && eventName === 'LangGraph') {
            const finalState = (event as any).data?.output as AgentState;
            if (finalState?.messages && finalState.messages.length > 0) {
              const lastMessage = finalState.messages[finalState.messages.length - 1];
              if (lastMessage instanceof AIMessage) {
                const content = lastMessage.content;
                fullResponse = typeof content === 'string' ? content : JSON.stringify(content) || fullResponse;
              }
            }
          }
        }
      } catch (streamError) {
        this.logger.error('streamEvents failed', streamError);
        throw streamError;
      }

      const executionTime = Date.now() - startTime;

      // Store assistant message
      await this.episodicMemory.storeEvent(userId, {
        type: EventType.ASSISTANT_MESSAGE,
        sessionId,
        content: fullResponse,
        timestamp: new Date(),
      });

      await this.messageRepository.create({
        sessionId,
        content: fullResponse,
        role: 'assistant',
        metadata: {
          executionTime,
          ...enrichedMetadata,
        },
      });

      await this.sessionRepository.update(sessionId, {
        updatedAt: new Date(),
      });

      // Send completion event
      yield {
        type: 'complete',
        data: {
          metadata: {
            ...enrichedMetadata,
            executionTime,
          },
        },
      };
    } catch (error) {
      isError = true;
      this.logger.error(
        `Failed to process message stream: ${error}`,
        error instanceof Error ? error.stack : undefined,
      );

      yield {
        type: 'error',
        data: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    } finally {
      // Cleanup: persist user message even on error
      if (isError && userMessage) {
        this.logger.warn(
          `Persisting user message with error metadata for failed chat in session ${sessionId}`,
        );
      }
    }
  }

  private getUserProfile(userId: string): Promise<Record<string, any>> {
    // TODO: Implement user profile retrieval
    // This should fetch user profile from your user/profile service
    return Promise.resolve({ userId });
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
}
