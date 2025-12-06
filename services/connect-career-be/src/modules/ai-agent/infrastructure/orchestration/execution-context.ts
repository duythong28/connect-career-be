import { AgentContext, WorkflowState } from '../../domain/types/agent.types';
import {
  EpisodicMemory,
  SemanticMemory,
  ProceduralMemory,
} from '../../domain/interfaces/memory.interface';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class ExecutionContext {
  public readonly userId: string;
  public readonly sessionId: string;
  public conversationHistory: Message[] = [];
  public memory: {
    episodic: EpisodicMemory | null;
    semantic: SemanticMemory | null;
    procedural: ProceduralMemory | null;
  };
  public currentIntent?: string;
  public entities?: Record<string, any>;
  public workflowState?: WorkflowState;
  public metadata: Record<string, any> = {};

  constructor(
    userId: string,
    sessionId: string,
    memory?: {
      episodic?: EpisodicMemory;
      semantic?: SemanticMemory;
      procedural?: ProceduralMemory;
    },
  ) {
    this.userId = userId;
    this.sessionId = sessionId;
    this.memory = {
      episodic: memory?.episodic || null,
      semantic: memory?.semantic || null,
      procedural: memory?.procedural || null,
    };
  }

  addMessage(
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: Record<string, any>,
  ): void {
    this.conversationHistory.push({
      role,
      content,
      timestamp: new Date(),
      metadata,
    });
  }

  async updateMemory(
    type: 'episodic' | 'semantic' | 'procedural',
    data: any,
  ): Promise<void> {
    const memoryService = this.memory[type];
    if (!memoryService) {
      return;
    }

    switch (type) {
      case 'episodic':
        if ('storeEvent' in memoryService) {
          await memoryService.storeEvent(this.userId, data);
        }
        break;
      case 'semantic':
        if ('storeConcept' in memoryService) {
          await memoryService.storeConcept(
            data.concept,
            data.embedding,
            data.metadata,
          );
        }
        break;
      case 'procedural':
        if ('storeProcedure' in memoryService) {
          await memoryService.storeProcedure(data.name, data.steps);
        }
        break;
    }
  }

  async getRelevantMemory(query: string, limit: number = 5): Promise<any[]> {
    const results: any[] = [];

    // Search episodic memory
    if (this.memory.episodic) {
      const episodicResults = await this.memory.episodic.search(query, limit);
      results.push(...episodicResults.map((r) => ({ ...r, type: 'episodic' })));
    }

    // Search semantic memory
    if (this.memory.semantic) {
      const semanticResults = await this.memory.semantic.search(query, limit);
      results.push(...semanticResults.map((r) => ({ ...r, type: 'semantic' })));
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  toAgentContext(): AgentContext {
    return {
      userId: this.userId,
      sessionId: this.sessionId,
      task:
        this.conversationHistory[this.conversationHistory.length - 1]
          ?.content || '',
      intent: this.currentIntent,
      entities: this.entities,
      conversationHistory: this.conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      memory: {
        episodic: this.memory.episodic ? {} : undefined,
        semantic: this.memory.semantic ? {} : undefined,
        procedural: this.memory.procedural ? {} : undefined,
      },
      metadata: this.metadata,
    };
  }
}
