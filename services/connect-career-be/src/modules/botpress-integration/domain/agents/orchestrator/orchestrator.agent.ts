import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';
import { BaseAgent } from '../base.agent';
import { Injectable } from '@nestjs/common';
import {
  AgentContext,
  AgentResult,
} from 'src/modules/botpress-integration/infrastructure/types/agent.types';

@Injectable()
export class OrchestratorAgent extends BaseAgent {
  constructor(protected readonly aiService: AIService) {
    super(aiService, 'Orchestrator', 'Orchestrator agent');
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    return {
      success: true,
      data: 'Orchestrator agent',
    };
  }

  canHandle(task: string): boolean {
    return task === 'orchestrator';
  }
  getTools(): string[] {
    return [];
  }
}
