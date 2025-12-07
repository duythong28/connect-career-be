import { AgentContext, AgentResult } from '../types/agent.types';
import { ITool } from './tool.interface';

export type MemoryType = 'episodic' | 'semantic' | 'procedural';

export interface IAgent {
  name: string;
  description: string;
  capabilities: string[];

  execute(context: AgentContext): Promise<AgentResult>;

  canHandle(intent: string, entities?: Record<string, any>): boolean;

  getTools(): ITool[];

  getRequiredMemory(): MemoryType[];
}
