import { Injectable, Logger } from '@nestjs/common';
import {
  Task,
  WorkflowResult,
  WorkflowState,
  AgentContext,
  AgentResult,
} from '../../domain/types/agent.types';
import { ExecutionContext } from './execution-context';
import { AgentRouterService } from './agent-router.service';

@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(private readonly agentRouter: AgentRouterService) {}

  async executeWorkflow(
    tasks: Task[],
    context: ExecutionContext,
  ): Promise<WorkflowResult> {
    const workflowState: WorkflowState = {
      currentStep: 0,
      totalSteps: tasks.length,
      completedTasks: [],
      pendingTasks: tasks.map((t) => t.id),
      results: {},
    };

    context.workflowState = workflowState;

    const results: Record<string, AgentResult> = {};
    const errors: Error[] = [];

    // Build dependency graph
    const taskMap = new Map<string, Task>();
    tasks.forEach((task) => {
      task.status = 'pending';
      taskMap.set(task.id, task);
    });

    // Execute tasks in dependency order
    const executionOrder = this.topologicalSort(tasks);

    for (const taskId of executionOrder) {
      const task = taskMap.get(taskId);
      if (!task) {
        continue;
      }

      try {
        // Check dependencies
        if (task.dependencies && task.dependencies.length > 0) {
          const allDepsCompleted = task.dependencies.every((depId) =>
            workflowState.completedTasks.includes(depId),
          );
          if (!allDepsCompleted) {
            this.logger.warn(`Task ${taskId} has unmet dependencies, skipping`);
            continue;
          }
        }

        // Execute task
        task.status = 'in_progress';
        workflowState.currentStep += 1;

        const agent = this.agentRouter.getAgent(task.agent);
        if (!agent) {
          throw new Error(`Agent ${task.agent} not found`);
        }

        const agentContext: AgentContext = {
          ...context.toAgentContext(),
          task: task.type,
          intent: task.type,
          entities: task.parameters,
        };

        const result = await agent.execute(agentContext);
        results[taskId] = result;
        task.status = result.success ? 'completed' : 'failed';

        if (result.success) {
          workflowState.completedTasks.push(taskId);
          workflowState.results[taskId] = result.data;
        } else {
          errors.push(...(result.errors || []));
        }
      } catch (error) {
        this.logger.error(
          `Task ${taskId} failed: ${error}`,
          error instanceof Error ? error.stack : undefined,
        );
        task.status = 'failed';
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    // Synthesize final output
    const finalOutput = this.synthesizeOutput(results, workflowState);

    return {
      success: errors.length === 0,
      results,
      finalOutput,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private topologicalSort(tasks: Task[]): string[] {
    const sorted: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (taskId: string) => {
      if (visiting.has(taskId)) {
        // Circular dependency detected
        return;
      }
      if (visited.has(taskId)) {
        return;
      }

      visiting.add(taskId);
      const task = tasks.find((t) => t.id === taskId);
      if (task?.dependencies) {
        for (const depId of task.dependencies) {
          visit(depId);
        }
      }
      visiting.delete(taskId);
      visited.add(taskId);
      sorted.push(taskId);
    };

    for (const task of tasks) {
      if (!visited.has(task.id)) {
        visit(task.id);
      }
    }

    return sorted;
  }

  private synthesizeOutput(
    results: Record<string, AgentResult>,
    workflowState: WorkflowState,
  ): any {
    // Combine all successful results
    const successfulResults = Object.entries(results)
      .filter(([_, result]) => result.success)
      .map(([taskId, result]) => ({
        taskId,
        data: result.data,
        explanation: result.explanation,
      }));

    return {
      tasksCompleted: workflowState.completedTasks.length,
      tasksTotal: workflowState.totalSteps,
      results: successfulResults,
    };
  }
}
