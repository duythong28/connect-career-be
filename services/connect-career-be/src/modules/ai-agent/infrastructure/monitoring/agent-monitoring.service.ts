import { Injectable, Logger } from '@nestjs/common';
import { AgentResult } from '../../domain/types/agent.types';

export interface AgentMetrics {
  agentName: string;
  totalExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  errorCount: number;
  lastExecution?: Date;
}

@Injectable()
export class AgentMonitoringService {
  private readonly logger = new Logger(AgentMonitoringService.name);
  private readonly metrics = new Map<string, AgentMetrics>();

  recordExecution(
    agentName: string,
    result: AgentResult,
    executionTime: number,
  ): void {
    const current = this.metrics.get(agentName) || {
      agentName,
      totalExecutions: 0,
      successRate: 0,
      averageExecutionTime: 0,
      errorCount: 0,
    };

    current.totalExecutions += 1;
    current.lastExecution = new Date();

    if (!result.success) {
      current.errorCount += 1;
    }

    // Update success rate
    current.successRate =
      ((current.totalExecutions - current.errorCount) /
        current.totalExecutions) *
      100;

    // Update average execution time
    current.averageExecutionTime =
      (current.averageExecutionTime * (current.totalExecutions - 1) +
        executionTime) /
      current.totalExecutions;

    this.metrics.set(agentName, current);

    this.logger.debug(
      `Agent ${agentName} metrics updated: ${JSON.stringify(current)}`,
    );
  }

  getMetrics(agentName?: string): AgentMetrics | AgentMetrics[] {
    if (agentName) {
      return this.metrics.get(agentName) || this.createEmptyMetrics(agentName);
    }
    return Array.from(this.metrics.values());
  }

  private createEmptyMetrics(agentName: string): AgentMetrics {
    return {
      agentName,
      totalExecutions: 0,
      successRate: 0,
      averageExecutionTime: 0,
      errorCount: 0,
    };
  }
}
