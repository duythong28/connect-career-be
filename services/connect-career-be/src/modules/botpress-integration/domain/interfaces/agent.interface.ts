import {
  AgentContext,
  AgentResult,
} from '../../infrastructure/types/agent.types';

export interface IAgent {
  name: string;
  description: string;

  execute(context: AgentContext): Promise<AgentResult>;

  canHandle(task: string): boolean;

  getTools(): string[];
}
