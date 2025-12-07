import { Module } from '@nestjs/common';
import { BotpressController } from './api/controllers/botpress.controller';
import { BotpressIntegrationService } from './api/services/botpress-integration.service';
import { AIModule } from '../../shared/infrastructure/external-services/ai/ai.module';
import { JobsModule } from '../jobs/jobs.module';
import { ProfileModule } from '../profile/profile.module';
import { ApplicationsModule } from '../applications/applications.module';
import { MockAIInterviewModule } from '../mock-ai-interview/mock-ai-interview.module';
import { CacheModule } from '../../shared/infrastructure/cache/cache.module';

// Orchestrator
import { OrchestratorAgent } from './domain/agents/orchestrator/orchestrator.agent';

// Agents
import { JobMatchAgent } from './domain/agents/job-match/job-match.agent';
import { CareerCoachAgent } from './domain/agents/career-coach/career-coach.agent';
import { InterviewAgent } from './domain/agents/interview/interview.agent';
import { ApplicationStatusAgent } from './domain/agents/application-status/application-status.agent';
import { ResearchAgent } from './domain/agents/research/research.agent';

// RAG Services
import { JobMatchRagService } from './infrastructure/rag/job-match-rag.service';
import { CareerRagService } from './infrastructure/rag/career-rag.service';
import { InterviewRagService } from './infrastructure/rag/interview-rag.service';
import { ApplicationRagService } from './infrastructure/rag/application-rag.service';
import { KnowledgeBaseRagService } from './infrastructure/rag/knowledge-base-rag.service';

// Memory Services

// Tools
import { ToolRegistryService } from './infrastructure/tools/tool-registry.service';
import { JobToolsService } from './infrastructure/tools/job-tools.service';
import { ProfileToolsService } from './infrastructure/tools/profile-tools.service';
import { InterviewToolsService } from './infrastructure/tools/interview-tools.service';

// Workflows
import { LangGraphWorkflowService } from './infrastructure/workflows/langgraph-workflow.service';
import { TaskDecomposerService } from './domain/agents/orchestrator/task-decomposer.service';
import { AgentRouterService } from './domain/agents/orchestrator/agent-router.service';
import { ResponseSynthesizerService } from './domain/agents/orchestrator/response-synthesizer.service';
import { ProactiveAgent } from './domain/agents/proative/proactive.agent';
import { EpisodicMemoryService } from './infrastructure/memory/episodic-memory.service';
import { SemanticMemoryService } from './infrastructure/memory/semantic-memory.service';
import { ProceduralMemoryService } from './infrastructure/memory/procedural-memory.service';

@Module({
  imports: [
    AIModule,
    JobsModule,
    ProfileModule,
    ApplicationsModule,
    MockAIInterviewModule,
    CacheModule,
  ],
  controllers: [BotpressController],
  providers: [
    // Core Services
    BotpressIntegrationService,

    // Orchestrator
    OrchestratorAgent,
    TaskDecomposerService,
    AgentRouterService,
    ResponseSynthesizerService,

    // Agents
    JobMatchAgent,
    CareerCoachAgent,
    InterviewAgent,
    ApplicationStatusAgent,
    ResearchAgent,
    ProactiveAgent,

    // RAG Services
    JobMatchRagService,
    CareerRagService,
    InterviewRagService,
    ApplicationRagService,
    KnowledgeBaseRagService,

    // Memory Services
    EpisodicMemoryService,
    SemanticMemoryService,
    ProceduralMemoryService,

    // Tools
    ToolRegistryService,
    JobToolsService,
    ProfileToolsService,
    InterviewToolsService,

    // Workflows
    LangGraphWorkflowService,
  ],
  exports: [BotpressIntegrationService, OrchestratorAgent],
})
export class BotpressIntegrationModule {}
