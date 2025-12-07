import { Injectable, Logger } from '@nestjs/common';
import { IAgent } from '../domain/interfaces/agent.interface';
import { AgentContext, AgentResult } from '../domain/types/agent.types';
import { AgentRouterService } from '../infrastructure/orchestration/agent-router.service';

@Injectable()
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);

  constructor(private readonly agentRouter: AgentRouterService) {}

  async executeAgent(
    agentName: string,
    context: AgentContext,
  ): Promise<AgentResult> {
    const agent = this.agentRouter.getAgent(agentName);
    if (!agent) {
      throw new Error(`Agent ${agentName} not found`);
    }

    const startTime = Date.now();
    try {
      const result = await agent.execute(context);
      const executionTime = Date.now() - startTime;

      return {
        ...result,
        executionTime,
        agentName: agent.name,
      };
    } catch (error) {
      this.logger.error(
        `Agent execution failed: ${error}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async getAvailableAgents(): Promise<
    Array<{ name: string; description: string; capabilities: string[] }>
  > {
    const agents = this.agentRouter.getAvailableAgents();
    return agents.map((agent) => ({
      name: agent.name,
      description: agent.description,
      capabilities: agent.capabilities,
    }));
  }

  async getAgentCapabilities(agentName: string): Promise<{
    name: string;
    description: string;
    capabilities: string[];
    tools: string[];
    requiredMemory: string[];
  } | null> {
    const agent = this.agentRouter.getAgent(agentName);
    if (!agent) {
      return null;
    }

    return {
      name: agent.name,
      description: agent.description,
      capabilities: agent.capabilities,
      tools: agent.getTools().map((tool) => tool.name),
      requiredMemory: agent.getRequiredMemory(),
    };
  }
}
