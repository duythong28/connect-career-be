import { Injectable, Logger } from '@nestjs/common';
import { IntentDetectorService } from '../orchestration/intent-detector.service';
import { AgentRouterService } from '../orchestration/agent-router.service';
import { WorkflowEngineService } from '../orchestration/workflow-engine.service';
import { ResponseSynthesizerService } from '../orchestration/response-synthesizer.service';
import { ExecutionContext } from '../orchestration/execution-context';
import { ChatResponseDto } from '../apis/dtos/chat-response.dto';
import { EpisodicMemoryService } from '../infrastructure/memory/episodic-memory.service';
import { SemanticMemoryService } from '../infrastructure/memory/semantic-memory.service';
import { ProceduralMemoryService } from '../infrastructure/memory/procedural-memory.service';

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
      const context = new ExecutionContext(
        userId,
        sessionId,
        {
          episodic: this.episodicMemory,
          semantic: this.semanticMemory,
          procedural: this.proceduralMemory,
        },
      );
  
      // Load conversation history from memory
      const recentEvents = await this.episodicMemory.retrieveEvents(userId);
      const conversationHistory = recentEvents
        .filter((e: any) => e.sessionId === sessionId && (e.type === 'user_message' || e.type === 'assistant_message'))
        .map((e: any) => ({
          role: e.type === 'user_message' ? 'user' : 'assistant',
          content: e.content || e.message,
        }));
  
      // Add conversation history to context
      conversationHistory.forEach(msg => {
        context.addMessage(
          msg.role as 'user' | 'assistant' | 'system',
          msg.content,
        );
      });
  
      // Add current user message
      context.addMessage('user', message, metadata);
  
      // Store user message
      await this.episodicMemory.storeEvent(userId, {
        type: 'user_message',
        sessionId,
        content: message,
        timestamp: new Date(),
      });
  
      // Detect intent
      const intentResult = await this.intentDetector.detectIntent(
        message,
        context.conversationHistory.map(msg => ({
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
  
      // Add assistant response to context
      context.addMessage('assistant', response);
  
      // Store assistant message
      await this.episodicMemory.storeEvent(userId, {
        type: 'assistant_message',
        sessionId,
        content: response,
        timestamp: new Date(),
      });
  
      // Store in memory
      await context.updateMemory('episodic', {
        intent: intentResult.intent,
        message,
        response,
        timestamp: new Date(),
      });
  
      const executionTime = Date.now() - startTime;
  
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

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  async createChat(userId: string): Promise<{ sessionId: string }> {
    const sessionId = this.generateSessionId();
    
    // Store initial session in memory
    await this.episodicMemory.storeEvent(userId, {
      type: 'chat_session_created',
      sessionId,
      timestamp: new Date(),
    });
    
    return { sessionId };
  }
}

