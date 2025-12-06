import { Injectable, Logger } from '@nestjs/common';
import { ITool } from '../../domain/interfaces/tool.interface';

@Injectable()
export class ToolRegistryService {
  private readonly logger = new Logger(ToolRegistryService.name);
  private readonly tools = new Map<string, ITool>();
  private readonly agentTools = new Map<string, string[]>(); // agentName -> toolNames[]

  registerTool(tool: ITool): void {
    this.tools.set(tool.name, tool);
    this.logger.log(`Registered tool: ${tool.name}`);
  }

  getTool(name: string): ITool | undefined {
    return this.tools.get(name);
  }

  getAllTools(): ITool[] {
    return Array.from(this.tools.values());
  }

  registerAgentTools(agentName: string, toolNames: string[]): void {
    this.agentTools.set(agentName, toolNames);
  }

  getToolsForAgent(agentName: string): ITool[] {
    const toolNames = this.agentTools.get(agentName) || [];
    return toolNames
      .map(name => this.tools.get(name))
      .filter((tool): tool is ITool => tool !== undefined);
  }

  async executeTool(name: string, parameters: Record<string, any>): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }

    try {
      return await tool.execute(parameters);
    } catch (error) {
      this.logger.error(
        `Tool execution failed: ${name}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}

