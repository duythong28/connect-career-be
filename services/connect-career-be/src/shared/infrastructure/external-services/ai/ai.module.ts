import { Module } from '@nestjs/common';
import { VertexAIProvider } from './providers/vertex-ai.provider';
import { AIController } from './ai.controller';
import { AIService } from './services/ai.service';
import { AIJobDescriptionService } from './services/ai-job-description.service';
import { RetellAIProvider } from './providers/retell-ai.provider';
import { OpenAIGeminiProvider } from './providers/openai-gemini.provider';
import { AICVEnhancementService } from './services/ai-cv-enhancement.service';
import { CV } from 'src/modules/cv-maker/domain/entities/cv.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { File } from '../file-system/domain/entities/file.entity';
import { WalletModule } from 'src/modules/subscription/subscription.module';
import { OrganizationMembership } from 'src/modules/profile/domain/entities/organization-memberships.entity';
import { CandidateProfile } from 'src/modules/profile/domain/entities/candidate-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CV,
      File,
      CandidateProfile,
      OrganizationMembership,
    ]),
    WalletModule,
  ],
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
