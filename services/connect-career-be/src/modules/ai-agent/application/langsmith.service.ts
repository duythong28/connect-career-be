import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'langsmith';

@Injectable()
export class LangSmithService {
  private readonly logger = new Logger(LangSmithService.name);
  private client: Client | null = null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('LANGSMITH_API_KEY');
    const apiUrl = this.configService.get<string>('LANGSMITH_API_URL');

    if (apiKey) {
      this.client = new Client({
        apiKey,
        apiUrl: apiUrl || 'https://api.smith.langchain.com',
      });
    } else {
      this.logger.warn(
        'LangSmith API key not configured, agent execution tracking disabled',
      );
    }
  }

  async logAgentExecution(params: {
    sessionId: string;
    userId: string;
    agentName: string;
    input: any;
    output: any;
    metadata?: Record<string, any>;
  }): Promise<string | null> {
    if (!this.client) return null;

    try {
      const run = (await this.client.createRun({
        name: params.agentName,
        run_type: 'chain',
        inputs: params.input as Record<string, unknown>,
        outputs: params.output as Record<string, unknown>,
        extra: {
          sessionId: params.sessionId,
          userId: params.userId,
          ...params.metadata,
        },
      })) as { id?: string } | undefined;

      return run?.id || null;
    } catch (error) {
      this.logger.error('Failed to log to LangSmith', error);
      return null;
    }
  }

  async logLLMCall(params: {
    sessionId: string;
    userId: string;
    model: string;
    prompt: string;
    response: string;
    tokensUsed?: number;
    metadata?: Record<string, any>;
  }): Promise<string | null> {
    if (!this.client) return null;

    try {
      const run = (await this.client.createRun({
        name: 'llm_call',
        run_type: 'llm',
        inputs: { prompt: params.prompt } as Record<string, unknown>,
        outputs: { response: params.response } as Record<string, unknown>,
        extra: {
          sessionId: params.sessionId,
          userId: params.userId,
          model: params.model,
          tokensUsed: params.tokensUsed,
          ...params.metadata,
        },
      })) as { id?: string } | undefined;

      return run?.id || null;
    } catch (error) {
      this.logger.error('Failed to log LLM call to LangSmith', error);
      return null;
    }
  }
}
