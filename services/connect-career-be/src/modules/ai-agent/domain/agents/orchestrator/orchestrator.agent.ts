import { Injectable } from '@nestjs/common';
import { BaseAgent } from '../base.agent';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';
import { AgentContext, AgentResult, Task } from '../../types/agent.types';
import { ITool } from '../../interfaces/tool.interface';
import { WorkflowEngineService } from '../../../infrastructure/orchestration/workflow-engine.service';
import { ExecutionContext } from '../../../infrastructure/orchestration/execution-context';

@Injectable()
export class OrchestratorAgent extends BaseAgent {
  constructor(
    aiService: AIService,
    private readonly workflowEngine: WorkflowEngineService,
  ) {
    super(
      aiService,
      'OrchestratorAgent',
      'Orchestrates complex multi-step tasks by decomposing them and coordinating multiple agents',
      ['orchestration', 'task_decomposition', 'workflow_management'],
    );
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      // Decompose the task into subtasks
      const tasks = await this.decomposeTask(context);

      if (tasks.length === 0) {
        return this.createErrorResult(
          [new Error('Failed to decompose task')],
          'Unable to break down the task into actionable steps.',
        );
      }

      // Create execution context
      const executionContext = new ExecutionContext(
        context.userId,
        context.sessionId,
      );

      // Execute workflow
      const workflowResult = await this.workflowEngine.executeWorkflow(
        tasks,
        executionContext,
      );

      if (!workflowResult.success) {
        return this.createErrorResult(
          workflowResult.errors || [],
          'Workflow execution completed with errors.',
        );
      }

      return this.createSuccessResult(
        workflowResult.finalOutput,
        'Task completed successfully through orchestrated workflow.',
        [],
        { workflowResult },
      );
    } catch (error) {
      return this.createErrorResult(
        [error instanceof Error ? error : new Error(String(error))],
        'Orchestration failed.',
      );
    }
  }

  canHandle(intent: string, entities?: Record<string, any>): boolean {
    // Orchestrator handles complex, multi-step tasks
    const complexIntents = [
      'complex_query',
      'multi_step',
      'workflow',
      'orchestration',
    ];
    return complexIntents.includes(intent) || intent.includes('and');
  }

  getTools(): ITool[] {
    return [];
  }

  getRequiredMemory(): Array<'episodic' | 'semantic' | 'procedural'> {
    return ['episodic', 'procedural'];
  }

  private async decomposeTask(context: AgentContext): Promise<Task[]> {
    const prompt = `Decompose the following task into smaller, actionable subtasks that can be handled by specialized agents.

Task: ${context.task}
Intent: ${context.intent || 'unknown'}
Entities: ${JSON.stringify(context.entities || {})}

Available agents:
- JobDiscoveryAgent: Find and search for jobs
- MatchingAgent: Match jobs to user profile
- AnalysisAgent: Analyze data and provide insights
- InformationGatheringAgent: Gather information
- CvEnhancementAgent: Review and improve CV/resume
- OrganizationCultureAgent: Provide company culture information
- LearningPlanAgent: Suggest learning resources and roadmaps
- FaqAgent: Answer general questions
- ComparisonAgent: Compare jobs, companies, or offers

Return ONLY a valid JSON array of tasks with this structure (no markdown, no explanations):
[
  {
    "id": "task1",
    "type": "job_search",
    "agent": "JobDiscoveryAgent",
    "parameters": {},
    "dependencies": []
  }
]`;

    try {
      const response = await this.callLLM(prompt, {
        systemPrompt:
          'You are a task decomposition expert. Break down complex tasks into atomic, executable subtasks. Return ONLY valid JSON array, no markdown formatting or explanations.',
      });
      // Clean the response to remove markdown code fences
      const cleanedContent = this.cleanJsonArrayResponse(response);
      const tasks = JSON.parse(cleanedContent) as Task[];
      return Array.isArray(tasks) ? tasks : [];
    } catch (error) {
      this.logger.error(`Task decomposition failed: ${error}`);
      // Fallback: create a single task
      return [
        {
          id: 'task1',
          type: context.intent || 'unknown',
          agent: 'InformationGatheringAgent',
          parameters: context.entities || {},
        },
      ];
    }
  }

  /**
   * Clean JSON array response from LLM
   * Handles both objects and arrays, removes markdown code fences
   */
  private cleanJsonArrayResponse(content: string): string {
    // Remove markdown code fences
    let cleaned = content
      .replace(/^```(json\s*)?/i, '')
      .replace(/```$/i, '')
      .trim();

    // Try to extract JSON array if present
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      cleaned = arrayMatch[0];
    } else {
      // Fallback to object extraction (for single task)
      const objectMatch = cleaned.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        cleaned = `[${objectMatch[0]}]`; // Wrap in array
      }
    }

    return cleaned;
  }
}
