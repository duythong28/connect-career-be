import { Module } from '@nestjs/common';
import { VertexAIProvider } from './providers/vertex-ai.provider';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';
import { RetellAIProvider } from './providers/retell-ai.provider';
import { OpenAIGeminiProvider } from './providers/openai-gemini.provider';

@Module({
  providers: [
    {
      provide: 'AIProvider',
      useFactory: () => {
        return new VertexAIProvider();
      },
    },
    {
      provide: 'GeminiProvider',
      useFactory: () => {
        return new OpenAIGeminiProvider();
      },
    },
    AIService,
    RetellAIProvider,
  ],
  exports: ['AIProvider', 'GeminiProvider', AIService, RetellAIProvider],
  controllers: [AIController],
})
export class AIModule {}
