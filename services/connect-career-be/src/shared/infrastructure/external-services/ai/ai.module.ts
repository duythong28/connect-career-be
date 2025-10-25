import { Module } from '@nestjs/common';
import { VertexAIProvider } from './providers/vertex-ai.provider';
import { AIController } from './ai.controller';
import { AIService } from './services/ai.service';
import { AIJobDescriptionService } from './services/ai-job-description.service';

@Module({
  providers: [
    {
      provide: 'AIProvider',
      useFactory: () => {
        return new VertexAIProvider();
      },
    },
    AIService,
    AIJobDescriptionService,
  ],
  exports: ['AIProvider', AIJobDescriptionService],
  controllers: [AIController],
})
export class AIModule {}
