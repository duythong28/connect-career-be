import { Injectable, Logger } from '@nestjs/common';
import { IntentDetectorService } from '../infrastructure/orchestration/intent-detector.service';
import { AgentRouterService } from '../infrastructure/orchestration/agent-router.service';
import { WorkflowEngineService } from '../infrastructure/orchestration/workflow-engine.service';
import { ResponseSynthesizerService } from '../infrastructure/orchestration/response-synthesizer.service';
import { ExecutionContext } from '../infrastructure/orchestration/execution-context';
import { ChatResponseDto } from '../apis/dtos/chat-response.dto';
import { EpisodicMemoryService } from '../infrastructure/memory/episodic-memory.service';
import { SemanticMemoryService } from '../infrastructure/memory/semantic-memory.service';
import { ProceduralMemoryService } from '../infrastructure/memory/procedural-memory.service';
import { ConversationRepository } from '../domain/repositories/conversation.repository';
import { EventType } from '../domain/enums/event-type.enum';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly intentDetector: IntentDetectorService,
    private readonly agentRouter: AgentRouterService,
    private readonly workflowEngine: WorkflowEngineService,
    private readonly responseSynthesizer: ResponseSynthesizerService,
    private readonly episodicMemory: EpisodicMemoryService,
    private readonly semanticMemory: SemanticMemoryService,
    private readonly proceduralMemory: ProceduralMemoryService,
    private readonly conversationRepository: ConversationRepository,
  ) {}

  async processMessage(
    userId: string,
    sessionId: string,
    message: string,
    metadata?: Record<string, any>,
  ): Promise<ChatResponseDto> {
    const startTime = Date.now();

    try {
      // Create execution context
      const context = new ExecutionContext(userId, sessionId, {
        episodic: this.episodicMemory,
        semantic: this.semanticMemory,
        procedural: this.proceduralMemory,
      });

      // Load conversation history from memory
      const recentEvents = await this.episodicMemory.retrieveEvents(userId);
      const conversationHistory = recentEvents
        .filter(
          (e: { sessionId?: string; type?: string }) =>
            e.sessionId === sessionId &&
            (e.type === EventType.USER_MESSAGE || e.type === EventType.ASSISTANT_MESSAGE),
        )
        .map((e: { type?: string; content?: string; message?: string }) => {
          const role: 'user' | 'assistant' =
            e.type === EventType.USER_MESSAGE ? 'user' : 'assistant';
          const content: string = e.content || e.message || '';
          return { role, content };
        });

      // Add conversation history to context
      conversationHistory.forEach((msg) => {
        context.addMessage(msg.role, msg.content);
      });

      // Add current user message
      context.addMessage('user', message, metadata);

      // Store user message in episodic memory
      await this.episodicMemory.storeEvent(userId, {
        type: EventType.USER_MESSAGE,
        sessionId,
        content: message,
        timestamp: new Date(),
      });

      // Persist user message to database
      await this.conversationRepository.create({
        userId,
        sessionId,
        message,
        role: 'user',
        metadata,
      });

      // Detect intent
      const intentResult = await this.intentDetector.detectIntent(
        message,
        context.conversationHistory.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        metadata,
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

      // Add assistant response to context
      context.addMessage('assistant', response);

      // Store assistant message in episodic memory
      await this.episodicMemory.storeEvent(userId, {
        type: EventType.ASSISTANT_MESSAGE,
        sessionId,
        content: response,
        timestamp: new Date(),
      });

      // Persist assistant message to database
      await this.conversationRepository.create({
        userId,
        sessionId,
        message: response,
        role: 'assistant',
        intent: intentResult.intent,
        entities: intentResult.entities,
        agentName: agent.name,
        metadata: {
          ...metadata,
          executionTime,
          confidence: intentResult.confidence,
        },
      });

      // Store in memory
      await context.updateMemory('episodic', {
        intent: intentResult.intent,
        message,
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
        metadata: {
          ...metadata,
          executionTime,
          confidence: intentResult.confidence,
        },
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
  
    try {
      // Create execution context
      const context = new ExecutionContext(userId, sessionId, {
        episodic: this.episodicMemory,
        semantic: this.semanticMemory,
        procedural: this.proceduralMemory,
      });
  
      // Load conversation history from memory
      const recentEvents = await this.episodicMemory.retrieveEvents(userId);
      const conversationHistory = recentEvents
        .filter(
          (e: { sessionId?: string; type?: string }) =>
            e.sessionId === sessionId &&
            (e.type === EventType.USER_MESSAGE || e.type === EventType.ASSISTANT_MESSAGE),
        )
        .map((e: { type?: string; content?: string; message?: string }) => {
          const role: 'user' | 'assistant' =
            e.type === EventType.USER_MESSAGE ? 'user' : 'assistant';
          const content: string = e.content || e.message || '';
          return { role, content };
        });
  
      // Add conversation history to context
      conversationHistory.forEach((msg) => {
        context.addMessage(msg.role, msg.content);
      });
  
      // Add current user message
      context.addMessage('user', message, metadata);
  
      // Store user message in episodic memory
      await this.episodicMemory.storeEvent(userId, {
        type: EventType.USER_MESSAGE,
        sessionId,
        content: message,
        timestamp: new Date(),
      });
  
      // Persist user message to database
      await this.conversationRepository.create({
        userId,
        sessionId,
        message,
        role: 'user',
        metadata,
      });
  
      // Detect intent
      const intentResult = await this.intentDetector.detectIntent(
        message,
        context.conversationHistory.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        metadata,
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
  
      // Stream response synthesis
      let fullResponse = '';
      const responseStream = this.responseSynthesizer.synthesizeStream(
        [agentResult],
        context,
      );

      // Stream chunks
      for await (const chunk of responseStream) {
        fullResponse += chunk;
        yield {
          type: 'chunk',
          data: { content: chunk },
        };
      }
  
      const executionTime = Date.now() - startTime;
  
      // Add assistant response to context
      context.addMessage('assistant', fullResponse);
  
      // Store assistant message in episodic memory
      await this.episodicMemory.storeEvent(userId, {
        type: EventType.ASSISTANT_MESSAGE,
        sessionId,
        content: fullResponse,
        timestamp: new Date(),
      });
  
      // Persist assistant message to database
      await this.conversationRepository.create({
        userId,
        sessionId,
        message: fullResponse,
        role: 'assistant',
        intent: intentResult.intent,
        entities: intentResult.entities,
        agentName: agent.name,
        metadata: {
          ...metadata,
          executionTime,
          confidence: intentResult.confidence,
        },
      });
  
      // Store in memory
      await context.updateMemory('episodic', {
        intent: intentResult.intent,
        message,
        response: fullResponse,
        timestamp: new Date(),
      });
  
      // Send completion event
      yield {
        type: 'complete',
        data: {
          agent: agent.name,
          suggestions: agentResult.nextSteps || [],
          intent: intentResult.intent,
          entities: intentResult.entities,
          metadata: {
            ...metadata,
            executionTime,
            confidence: intentResult.confidence,
          },
        },
      };
    } catch (error) {
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
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async createChat(userId: string): Promise<{ sessionId: string }> {
    const sessionId = this.generateSessionId();

    await this.episodicMemory.storeEvent(userId, {
      type: EventType.CHAT_SESSION_CREATED,
      sessionId,
      timestamp: new Date(),
    });

    return { sessionId };
  }

  /**
   * Get conversation history for a specific session
   */
  async getConversationHistory(
    userId: string,
    sessionId: string,
  ): Promise<
    Array<{
      id: string;
      role: 'user' | 'assistant' | 'system';
      message: string;
      intent?: string;
      agentName?: string;
      createdAt: Date;
      metadata?: Record<string, any>;
    }>
  > {
    const conversations =
      await this.conversationRepository.findBySessionId(sessionId);

    // Verify user owns this session
    if (conversations.length > 0 && conversations[0].userId !== userId) {
      throw new Error('Unauthorized: Session does not belong to user');
    }

    return conversations.map((conv) => ({
      id: conv.id,
      role: conv.role,
      message: conv.message,
      intent: conv.intent,
      agentName: conv.agentName,
      createdAt: conv.createdAt,
      metadata: conv.metadata,
    }));
  }

  /**
   * Get all chat sessions for a user
   */
  async getUserChatSessions(
    userId: string,
    limit: number = 50,
  ): Promise<
    Array<{
      sessionId: string;
      lastMessage: string;
      lastMessageAt: Date;
      messageCount: number;
      firstMessageAt: Date;
    }>
  > {
    const conversations = await this.conversationRepository.findByUserId(
      userId,
      limit * 10,
    );

    // Group by sessionId
    const sessionMap = new Map<
      string,
      {
        sessionId: string;
        messages: typeof conversations;
      }
    >();

    conversations.forEach((conv) => {
      if (!sessionMap.has(conv.sessionId)) {
        sessionMap.set(conv.sessionId, {
          sessionId: conv.sessionId,
          messages: [],
        });
      }
      sessionMap.get(conv.sessionId)!.messages.push(conv);
    });

    // Format response
    return Array.from(sessionMap.values())
      .map(({ sessionId, messages }) => {
        const sortedMessages = messages.sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
        );

        return {
          sessionId,
          lastMessage: sortedMessages[sortedMessages.length - 1]?.message || '',
          lastMessageAt:
            sortedMessages[sortedMessages.length - 1]?.createdAt || new Date(),
          messageCount: sortedMessages.length,
          firstMessageAt: sortedMessages[0]?.createdAt || new Date(),
        };
      })
      .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get recent conversations across all sessions
   */
  async getRecentConversations(
    userId: string,
    limit: number = 20,
  ): Promise<
    Array<{
      id: string;
      sessionId: string;
      role: 'user' | 'assistant' | 'system';
      message: string;
      intent?: string;
      agentName?: string;
      createdAt: Date;
    }>
  > {
    const conversations = await this.conversationRepository.findByUserId(
      userId,
      limit,
    );

    return conversations
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map((conv) => ({
        id: conv.id,
        sessionId: conv.sessionId,
        role: conv.role,
        message: conv.message,
        intent: conv.intent,
        agentName: conv.agentName,
        createdAt: conv.createdAt,
      }));
  }
}
