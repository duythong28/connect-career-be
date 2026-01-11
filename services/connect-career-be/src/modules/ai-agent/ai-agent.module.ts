import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AIModule } from '../../shared/infrastructure/external-services/ai/ai.module';
import { RagModule } from './infrastructure/rag/rag.module';

// API Layer
import { AiAgentController } from './apis/controllers/ai-agent.controller';

// Application Layer
import { ChatService } from './application/chat.service';
import { AiAgentService } from './application/ai-agent.service';
import { SuggestionService } from './application/suggestion.service';
import { MediaService } from './application/media.service';

// Orchestration Layer
import { IntentDetectorService } from './infrastructure/orchestration/intent-detector.service';
import { AgentRouterService } from './infrastructure/orchestration/agent-router.service';
import { WorkflowEngineService } from './infrastructure/orchestration/workflow-engine.service';
import { ResponseSynthesizerService } from './infrastructure/orchestration/response-synthesizer.service';
import { RoleDetectorService } from './infrastructure/orchestration/role-detector.service';
import { GraphBuilderService } from './infrastructure/orchestration/graph-builder.service';

// Domain Layer - Entities
import { AgentExecutionEntity } from './domain/entities/agent-execution.entity';
import { ConversationEntity } from './domain/entities/conversation.entity';
import { SessionEntity } from './domain/entities/session.entity';
import { MessageEntity } from './domain/entities/message.entity';
import { AttachmentEntity } from './domain/entities/attachment.entity';

// Domain Layer - Repositories
import { AgentExecutionRepository } from './domain/repositories/agent-execution.repository';
import { ConversationRepository } from './domain/repositories/conversation.repository';
import { SessionRepository } from './domain/repositories/session.repository';
import { MessageRepository } from './domain/repositories/message.repository';
import { AttachmentRepository } from './domain/repositories/attachment.repository';

// Domain Layer - Agents
import { OrchestratorAgent } from './domain/agents/orchestrator/orchestrator.agent';
import { ComparisonAgent } from './domain/agents/comparision/comparision.agent';
import { JobDiscoveryAgent } from './domain/agents/job-discovery/job-discovery.agent';
import { FaqAgent } from './domain/agents/faq/faq.agent';
import { MatchingAgent } from './domain/agents/matching/matching.agent';
import { AnalysisAgent } from './domain/agents/analysis/analysis.agent';
import { InformationGatheringAgent } from './domain/agents/information-gathering/information-gathering.agent';

// Infrastructure Layer - LLM
import { ChainsService } from './infrastructure/llm/chains.service';

// Infrastructure Layer - Tools
import { ToolRegistryService } from './infrastructure/tools/tool-registry.service';
import { JobToolsService } from './infrastructure/tools/job-tools.service';
import { CvToolsService } from './infrastructure/tools/cv-tools.service';
import { LearningToolsService } from './infrastructure/tools/learning-tools.service';
import { ValidationToolsService } from './infrastructure/tools/validation-tools.service';

// Infrastructure Layer - Memory
import { EpisodicMemoryService } from './infrastructure/memory/episodic-memory.service';
import { SemanticMemoryService } from './infrastructure/memory/semantic-memory.service';
import { ProceduralMemoryService } from './infrastructure/memory/procedural-memory.service';

// Infrastructure Layer - Monitoring
import { AgentMonitoringService } from './infrastructure/monitoring/agent-monitoring.service';
import { AnalyticsService } from './infrastructure/monitoring/analytics.service';
import { ExecutionLoggerService } from './infrastructure/monitoring/execution-log.service';
import { LangSmithService } from './application/langsmith.service';

// Infrastructure Layer - Prompts
import { PromptService } from './infrastructure/prompts/prompt.service';
import { User } from '../identity/domain/entities';
import { CandidateProfile } from '../profile/domain/entities/candidate-profile.entity';
import { LearningPlanAgent } from './domain/agents/learning-plans/learning-plan.agent';
import { CvEnhancementAgent } from './domain/agents/cv-enhancement/cv-enhancement.agent';
import { OrganizationCultureAgent } from './domain/agents/organization-culture/organization-culture.agent';
import { JobsModule } from '../jobs/jobs.module';
@Module({
  imports: [
    ConfigModule,
    AIModule,
    RagModule,
    TypeOrmModule.forFeature([
      AgentExecutionEntity,
      ConversationEntity,
      SessionEntity,
      MessageEntity,
      AttachmentEntity,
      User,
      CandidateProfile,
    ]),
    JobsModule,
  ],
  controllers: [AiAgentController],
  providers: [
    // Application Services
    ChatService,
    AiAgentService,
    SuggestionService,
    // AgentLogService, // TODO: Uncomment when service is created
    MediaService,
    LangSmithService,

    // Orchestration Services
    IntentDetectorService,
    AgentRouterService,
    WorkflowEngineService,
    ResponseSynthesizerService,
    RoleDetectorService,
    GraphBuilderService,

    // Infrastructure Services - LLM
    ChainsService,

    // Infrastructure Services - Tools
    ToolRegistryService,
    JobToolsService,
    CvToolsService,
    LearningToolsService,
    ValidationToolsService,

    // Infrastructure Services - Memory
    EpisodicMemoryService,
    SemanticMemoryService,
    ProceduralMemoryService,

    // Infrastructure Services - Monitoring
    AgentMonitoringService,
    AnalyticsService,
    ExecutionLoggerService,

    // Infrastructure Services - Prompts
    PromptService,

    // Domain Repositories
    AgentExecutionRepository,
    ConversationRepository,
    SessionRepository,
    MessageRepository,
    AttachmentRepository,

    // Agents
    OrchestratorAgent,
    ComparisonAgent,
    JobDiscoveryAgent,
    FaqAgent,
    MatchingAgent,
    AnalysisAgent,
    InformationGatheringAgent,
    LearningPlanAgent,
    CvEnhancementAgent,
    OrganizationCultureAgent,

    // Agent registration - register agents after instantiation
    {
      provide: 'AGENT_REGISTRATION',
      useFactory: (
        agentRouter: AgentRouterService,
        orchestratorAgent: OrchestratorAgent,
        comparisonAgent: ComparisonAgent,
        jobDiscoveryAgent: JobDiscoveryAgent,
        faqAgent: FaqAgent,
        matchingAgent: MatchingAgent,
        analysisAgent: AnalysisAgent,
        informationGatheringAgent: InformationGatheringAgent,
        toolRegistry: ToolRegistryService,
        learningPlanAgent: LearningPlanAgent,
        cvEnhancementAgent: CvEnhancementAgent,
        organizationCultureAgent: OrganizationCultureAgent,
        jobTools: JobToolsService,
        cvTools: CvToolsService,
        learningTools: LearningToolsService,
        validationTools: ValidationToolsService,
      ) => {
        // Register all tools
        jobTools
          .getAllTools()
          .forEach((tool) => toolRegistry.registerTool(tool));
        cvTools
          .getAllTools()
          .forEach((tool) => toolRegistry.registerTool(tool));
        learningTools
          .getAllTools()
          .forEach((tool) => toolRegistry.registerTool(tool));
        validationTools
          .getAllTools()
          .forEach((tool) => toolRegistry.registerTool(tool));

        // Register all agents
        agentRouter.registerAgent(orchestratorAgent);
        agentRouter.registerAgent(comparisonAgent);
        agentRouter.registerAgent(jobDiscoveryAgent);
        agentRouter.registerAgent(faqAgent);
        agentRouter.registerAgent(matchingAgent);
        agentRouter.registerAgent(analysisAgent);
        agentRouter.registerAgent(informationGatheringAgent);
        agentRouter.registerAgent(learningPlanAgent);
        agentRouter.registerAgent(cvEnhancementAgent);
        agentRouter.registerAgent(organizationCultureAgent);
        return true;
      },
      inject: [
        AgentRouterService,
        OrchestratorAgent,
        ComparisonAgent,
        JobDiscoveryAgent,
        FaqAgent,
        MatchingAgent,
        AnalysisAgent,
        InformationGatheringAgent,
        ToolRegistryService,
        LearningPlanAgent,
        CvEnhancementAgent,
        OrganizationCultureAgent,
        JobToolsService,
        CvToolsService,
        LearningToolsService,
        ValidationToolsService,
      ],
    },
  ],
  exports: [
    // Application Services
    ChatService,
    AiAgentService,

    // Orchestration Services
    AgentRouterService,

    // Infrastructure Services
    ToolRegistryService,
    EpisodicMemoryService,
    SemanticMemoryService,
    ProceduralMemoryService,
    ChainsService,

    // Monitoring Services
    AgentMonitoringService,
    AnalyticsService,

    // Repositories
    AgentExecutionRepository,
    ConversationRepository,
  ],
})
export class AiAgentModule {}
