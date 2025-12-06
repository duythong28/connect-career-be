import { Injectable, Logger } from '@nestjs/common';
import { AgentResult } from '../../domain/types/agent.types';

@Injectable()
export class ExecutionLoggerService {
  private readonly logger = new Logger(ExecutionLoggerService.name);

  logExecution(
    agentName: string,
    context: any,
    result: AgentResult,
    executionTime: number,
  ): void {
    const logData = {
      agent: agentName,
      task: context.task,
      intent: context.intent,
      success: result.success,
      executionTime,
      timestamp: new Date().toISOString(),
    };

    if (result.success) {
      this.logger.log(`Agent execution successful: ${JSON.stringify(logData)}`);
    } else {
      this.logger.error(
        `Agent execution failed: ${JSON.stringify(logData)}`,
        result.errors,
      );
    }
  }
}
