import { Injectable, Logger } from '@nestjs/common';
import { AgentResult } from '../domain/types/agent.types';

export interface AgentLogEntry {
  id: string;
  userId: string;
  sessionId: string;
  agentName: string;
  intent?: string;
  task: string;
  result: AgentResult;
  timestamp: Date;
  executionTime: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class AgentLogService {
  private readonly logger = new Logger(AgentLogService.name);
  private readonly logs: Map<string, AgentLogEntry[]> = new Map();

  logExecution(entry: Omit<AgentLogEntry, 'id' | 'timestamp'>): void {
    const logEntry: AgentLogEntry = {
      ...entry,
      id: this.generateLogId(),
      timestamp: new Date(),
    };

    // Store in memory (in production, use a database)
    const userLogs = this.logs.get(entry.userId) || [];
    userLogs.push(logEntry);
    this.logs.set(entry.userId, userLogs);

    // Log to console
    this.logger.log(
      `Agent execution logged: ${entry.agentName} for user ${entry.userId} (${entry.executionTime}ms)`,
    );
  }

  getLogs(userId: string, limit: number = 50): AgentLogEntry[] {
    const userLogs = this.logs.get(userId) || [];
    return userLogs.slice(-limit).reverse();
  }

  getLogsByAgent(agentName: string, limit: number = 50): AgentLogEntry[] {
    const allLogs: AgentLogEntry[] = [];
    for (const logs of this.logs.values()) {
      allLogs.push(...logs.filter((log) => log.agentName === agentName));
    }
    return allLogs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getLogsBySession(sessionId: string): AgentLogEntry[] {
    const allLogs: AgentLogEntry[] = [];
    for (const logs of this.logs.values()) {
      allLogs.push(...logs.filter((log) => log.sessionId === sessionId));
    }
    return allLogs.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
