import { Injectable, Logger } from '@nestjs/common';
import { IAgent, MemoryType } from '../interfaces/agent.interface';
import { ITool } from '../interfaces/tool.interface';
import { AgentContext, AgentResult } from '../types/agent.types';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';

@Injectable()
export abstract class BaseAgent implements IAgent {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly aiService: AIService,
    public readonly name: string,
    public readonly description: string,
    public readonly capabilities: string[] = [],
  ) {}

  abstract execute(context: AgentContext): Promise<AgentResult>;

  abstract canHandle(intent: string, entities?: Record<string, any>): boolean;

  abstract getTools(): ITool[];

  abstract getRequiredMemory(): MemoryType[];

  protected async callLLM(
    prompt: string,
    context?: any,
    options?: {
      temperature?: number;
      maxOutputTokens?: number;
      systemPrompt?: string;
    },
  ): Promise<string> {
    try {
      const messages: Array<{
        role: 'user' | 'system' | 'assistant';
        content: string;
      }> = [];

      if (options?.systemPrompt) {
        messages.push({
          role: 'system',
          content: options.systemPrompt,
        });
      } else if (context) {
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
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxOutputTokens ?? 2048,
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

  protected createSuccessResult(
    data: any,
    explanation?: string,
    nextSteps?: string[],
    metadata?: Record<string, any>,
  ): AgentResult {
    return {
      success: true,
      data,
      explanation,
      nextSteps,
      metadata: {
        ...metadata,
        agentName: this.name,
      },
    };
  }

  protected createErrorResult(
    errors: Error[],
    explanation?: string,
    metadata?: Record<string, any>,
  ): AgentResult {
    return {
      success: false,
      errors,
      explanation,
      metadata: {
        ...metadata,
        agentName: this.name,
      },
    };
  }
}

