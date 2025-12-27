import { Inject, Injectable } from '@nestjs/common';
import * as aiProviderInterface from '../domain/ai-provider.interface';

@Injectable()
export class AIService {
  constructor(
    @Inject('AIProvider')
    private readonly provider: aiProviderInterface.AIProvider,
  ) {}

  chat(req: aiProviderInterface.AIChatRequest) {
    return this.provider.chat(req);
  }

  generate(req: aiProviderInterface.AIGenerateRequest) {
    return this.provider.generate(req);
  }

  generateWithInlineFile(req: {
    prompt: string;
    inline: { dataBase64: string; mimeType: string };
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
  }) {
    return (this.provider as any).generateWithInlineFile(req);
  }

  async *chatStream(
    request: aiProviderInterface.AIChatRequest,
  ): AsyncGenerator<string, void, unknown> {
    if (this.provider.chatStream) {
      yield* this.provider.chatStream(request);
    } else {
      // Fallback: simulate streaming by chunking the response
      const response = await this.chat(request);
      const words = response.content.split(' ');
      for (const word of words) {
        yield word + ' ';
        // Small delay to simulate streaming
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    }
  }

  async embed(
    req: aiProviderInterface.AIVectorizeRequest,
  ): Promise<aiProviderInterface.AIVectorizeResponse> {
    if (this.provider.embed) {
      return this.provider.embed(req);
    }
    throw new Error('Embedding not supported by current AI provider');
  }
}
