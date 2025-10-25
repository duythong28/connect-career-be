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
}
