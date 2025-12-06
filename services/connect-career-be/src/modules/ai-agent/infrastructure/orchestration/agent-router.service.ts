import { Injectable, Logger } from '@nestjs/common';
import { IAgent } from '../../domain/interfaces/agent.interface';
import { AgentContext, IntentResult } from '../../domain/types/agent.types';
import { IntentDetectorService } from './intent-detector.service';

@Injectable()
export class AgentRouterService {
  private readonly logger = new Logger(AgentRouterService.name);
  private readonly agents = new Map<string, IAgent>();

  constructor(private readonly intentDetector: IntentDetectorService) {}

  registerAgent(agent: IAgent): void {
    this.agents.set(agent.name, agent);
    this.logger.log(`Registered agent: ${agent.name}`);
  }

  async routeToAgent(intent: string, context: AgentContext): Promise<IAgent> {
    // Find agents that can handle this intent
    const candidateAgents: Array<{ agent: IAgent; score: number }> = [];

    for (const agent of this.agents.values()) {
      if (agent.canHandle(intent, context.entities)) {
        // Calculate score based on agent capabilities
        const score = this.calculateAgentScore(agent, intent, context);
        candidateAgents.push({ agent, score });
      }
    }

    if (candidateAgents.length === 0) {
      // Fallback to orchestrator or default agent
      const orchestrator = this.agents.get('OrchestratorAgent');
      if (orchestrator) {
        return orchestrator;
      }
      throw new Error(`No agent found to handle intent: ${intent}`);
    }

    // Return agent with highest score
    candidateAgents.sort((a, b) => b.score - a.score);
    const selectedAgent = candidateAgents[0].agent;

    this.logger.log(
      `Routed intent "${intent}" to agent "${selectedAgent.name}" (score: ${candidateAgents[0].score})`,
    );

    return selectedAgent;
  }

  private calculateAgentScore(
    agent: IAgent,
    intent: string,
    context: AgentContext,
  ): number {
    let score = 0.5; // Base score

    // Check if agent's capabilities match the intent
    if (agent.capabilities.includes(intent)) {
      score += 0.3;
    }

    // Check if agent has required tools for the task
    if (agent.getTools().length > 0) {
      score += 0.1;
    }

    // Check if agent requires memory that's available
    const requiredMemory = agent.getRequiredMemory();
    if (requiredMemory.length > 0 && context.memory) {
      const hasMemory = requiredMemory.every(
        (type) => context.memory?.[type] !== undefined,
      );
      if (hasMemory) {
        score += 0.1;
      }
    }

    return Math.min(1.0, score);
  }

  getAvailableAgents(): IAgent[] {
    return Array.from(this.agents.values());
  }

  getAgent(name: string): IAgent | undefined {
    return this.agents.get(name);
  }
}
