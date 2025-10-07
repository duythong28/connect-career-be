import { Module } from '@nestjs/common';
import { VertexAIProvider } from './providers/vertex-ai.provider';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';

@Module({
  providers: [
    {
      provide: 'AIProvider',
      useFactory: () => {
        return new VertexAIProvider();
      },
    },
    AIService,
  ],
  exports: ['AIProvider'],
  controllers: [AIController],
})
export class AIModule {}
