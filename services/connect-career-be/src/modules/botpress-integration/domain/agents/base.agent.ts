import { Injectable, Logger } from '@nestjs/common';
import { IAgent } from '../interfaces/agent.interface';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';
import {
  AgentContext,
  AgentResult,
} from '../../infrastructure/types/agent.types';

@Injectable()
export abstract class BaseAgent implements IAgent {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly aiService: AIService,
    public readonly name: string,
    public readonly description: string,
  ) {}

  abstract execute(context: AgentContext): Promise<AgentResult>;
  abstract canHandle(task: string): boolean;
  abstract getTools(): string[];

  protected async callLLM(prompt: string, context?: any): Promise<string> {
    try {
      const messages: Array<{
        role: 'user' | 'system' | 'assistant';
        content: string;
      }> = [];

      if (context) {
        messages.push({
          role: 'system',
          content:
            typeof context === 'string' ? context : JSON.stringify(context),
        });
      }

      messages.push({
        role: 'user',
        content: prompt,
      });

      const response = await this.aiService.chat({
        messages,
        temperature: 0.7,
        maxOutputTokens: 2048,
      });

      return response.content;
    } catch (error) {
      this.logger.error(
        `LLM call failed: ${error}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
