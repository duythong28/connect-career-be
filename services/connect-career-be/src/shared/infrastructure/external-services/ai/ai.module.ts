import { Module } from '@nestjs/common';
import { VertexAIProvider } from './providers/vertex-ai.provider';
import { AIController } from './ai.controller';
import { AIService } from './services/ai.service';
import { AIJobDescriptionService } from './services/ai-job-description.service';
import { RetellAIProvider } from './providers/retell-ai.provider';
import { OpenAIGeminiProvider } from './providers/openai-gemini.provider';
import { AICVEnhancementService } from './services/ai-cv-enhancement.service';

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
    AIJobDescriptionService,
    AICVEnhancementService,
    RetellAIProvider,
  ],
  exports: [
    'AIProvider',
    AIJobDescriptionService,
    AICVEnhancementService,
    'GeminiProvider',
    AIService,
    RetellAIProvider,
  ],
  controllers: [AIController],
})
export class AIModule {}
