import { Injectable, Logger } from '@nestjs/common';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';
import { AgentResult } from '../../domain/types/agent.types';
import { ExecutionContext } from './execution-context';
import { PromptService } from '../prompts/prompt.service';

@Injectable()
export class ResponseSynthesizerService {
  private readonly logger = new Logger(ResponseSynthesizerService.name);

  constructor(
    private readonly aiService: AIService,
    private readonly promptService: PromptService,
  ) {}

  async synthesize(
    agentResults: AgentResult[],
    context: ExecutionContext,
  ): Promise<string> {
    if (agentResults.length === 0) {
      return "I'm sorry, I couldn't process your request. Please try again.";
    }

    if (agentResults.length === 1) {
      const result = agentResults[0];
      if (result.explanation) {
        return result.explanation;
      }
      if (typeof result.data === 'string') {
        return result.data;
      }
      return this.formatStructuredData(result.data);
    }

    // Multiple results - synthesize them
    return await this.synthesizeMultipleResults(agentResults, context);
  }

  private async synthesizeMultipleResults(
    results: AgentResult[],
    context: ExecutionContext,
  ): Promise<string> {
    const successfulResults = results.filter((r) => r.success);
    const failedResults = results.filter((r) => !r.success);

    if (successfulResults.length === 0) {
      return this.formatErrorResponse(failedResults);
    }

    const systemPrompt = this.promptService.getResponseSynthesisSystemPrompt();

    const resultsSummary = successfulResults
      .map((result, index) => {
        return `Result ${index + 1} (from ${result.agentName || 'agent'}):
${result.explanation || this.formatStructuredData(result.data)}
${result.nextSteps ? `Next steps: ${result.nextSteps.join(', ')}` : ''}`;
      })
      .join('\n\n');

    const conversationContext = context.conversationHistory
      .slice(-3)
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');

    const originalRequest = conversationContext || 'User request';
    const prompt = this.promptService.getResponseSynthesisUserPrompt(
      originalRequest,
      resultsSummary,
      conversationContext,
    );

    try {
      const response = await this.aiService.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        maxOutputTokens: 1024,
      });

      return response.content;
    } catch (error) {
      this.logger.error(
        `Failed to synthesize response: ${error}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Fallback to simple concatenation
      return successfulResults
        .map((r) => r.explanation || this.formatStructuredData(r.data))
        .join('\n\n');
    }
  }

  private formatStructuredData(data: any): string {
    if (!data) {
      return '';
    }

    if (typeof data === 'string') {
      return data;
    }

    if (Array.isArray(data)) {
      if (data.length === 0) {
        return 'No results found.';
      }
      return data
        .map((item, index) => {
          if (typeof item === 'object') {
            return `${index + 1}. ${JSON.stringify(item, null, 2)}`;
          }
          return `${index + 1}. ${item}`;
        })
        .join('\n');
    }

    if (typeof data === 'object') {
      return JSON.stringify(data, null, 2);
    }

    return String(data);
  }

  async *synthesizeStream(
    results: AgentResult[],
    context: ExecutionContext,
  ): AsyncGenerator<string, void, unknown> {
    if (results.length === 0) {
      yield "I'm sorry, I couldn't process your request. Please try again.";
      return;
    }

    // Handle single result case - stream it directly if it's a string
    if (results.length === 1) {
      const result = results[0];
      if (result.explanation) {
        // Stream the explanation word by word for better UX
        const words = result.explanation.split(' ');
        for (const word of words) {
          yield word + ' ';
        }
        return;
      }
      if (typeof result.data === 'string') {
        const words = result.data.split(' ');
        for (const word of words) {
          yield word + ' ';
        }
        return;
      }
      // For structured data, format and stream
      const formatted = this.formatStructuredData(result.data);
      const words = formatted.split(' ');
      for (const word of words) {
        yield word + ' ';
      }
      return;
    }

    // Multiple results - synthesize them
    const successfulResults = results.filter((r) => r.success);
    const failedResults = results.filter((r) => !r.success);

    if (successfulResults.length === 0) {
      yield this.formatErrorResponse(failedResults);
      return;
    }

    const systemPrompt = this.promptService.getResponseSynthesisSystemPrompt();

    const resultsSummary = successfulResults
      .map((result, index) => {
        return `Result ${index + 1} (from ${result.agentName || 'agent'}):
${result.explanation || this.formatStructuredData(result.data)}
${result.nextSteps ? `Next steps: ${result.nextSteps.join(', ')}` : ''}`;
      })
      .join('\n\n');

    const conversationContext = context.conversationHistory
      .slice(-3)
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');

    const originalRequest = conversationContext || 'User request';
    const prompt = this.promptService.getResponseSynthesisUserPrompt(
      originalRequest,
      resultsSummary,
      conversationContext,
    );

    try {
      const stream = this.aiService.chatStream({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        maxOutputTokens: 1024,
      });

      for await (const chunk of stream) {
        yield chunk;
      }
    } catch (error) {
      this.logger.error(
        `Failed to synthesize response stream: ${error}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Fallback to simple concatenation
      const fallback = successfulResults
        .map((r) => r.explanation || this.formatStructuredData(r.data))
        .join('\n\n');
      const words = fallback.split(' ');
      for (const word of words) {
        yield word + ' ';
      }
    }
  }

  private formatErrorResponse(failedResults: AgentResult[]): string {
    const errorMessages = failedResults
      .map((r) => r.explanation || 'An error occurred')
      .join('; ');

    return `I encountered some issues while processing your request: ${errorMessages}. Please try again or rephrase your question.`;
  }
}
