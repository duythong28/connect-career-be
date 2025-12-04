import { Injectable, Logger } from "@nestjs/common";
import { AIService } from "src/shared/infrastructure/external-services/ai/services/ai.service";

export interface TaskPlan {
    task: Task[]; 
    dependencies: Map<string, string[]>;
    executionOrder: string[];
}

export interface Task { 
    id: string; 
    type: string; 
    agent: string; 
    parameters: Record<string, any>;
    dependencies?: string[];
}

@Injectable()
export class TaskDecomposerService {
    private readonly logger = new Logger(TaskDecomposerService.name);
    constructor(private readonly aiService: AIService) {}

    async decomposeTask(intent: string, entities: Record<string, any>, text: string): Promise<TaskPlan> {
        const prompt = this.buildDecompositionPrompt(intent, entities, text);
        try {}
        catch (error) {
            this.logger.error(`Failed to decompose task: ${error}`, error instanceof Error ? error.stack : undefined);\
            return this.createSimpleTaskPlan(intent, entities);
        }
    }

    private buildDecompositionPrompt(
        intent: string,
        entities: Record<string, any>,
        text: string,
      ): string {
        return `
    Analyze the user request and break it down into atomic tasks.
    
    User Intent: ${intent}
    Entities: ${JSON.stringify(entities)}
    User Text: ${text}
    
    Available Agents:
    - JobMatchAgent: Job search, matching, ranking
    - CareerCoachAgent: Career planning, skill gap analysis
    - InterviewAgent: Interview preparation, mock interviews
    - ApplicationStatusAgent: Application tracking, status updates
    - ResearchAgent: FAQ, knowledge retrieval
    
    Return a JSON object with this structure:
    {
      "tasks": [
        {
          "id": "task1",
          "type": "job_search",
          "agent": "JobMatchAgent",
          "parameters": {...},
          "dependencies": []
        }
      ],
      "executionOrder": ["task1", "task2"]
    }
    `};

    private buildDependencyMap(tasks: Task[]): Map<string, string[]> {
        const map = new Map<string, string[]>();
        tasks.forEach(task => {
          map.set(task.id, task.dependencies || []);
        });
        return map;
      }
      
    private createSimpleTaskPlan(
        intent: string,
        entities: Record<string, any>,
      ): TaskPlan {
        const agentMap: Record<string, string> = {
          job_search: 'JobMatchAgent',
          career_path: 'CareerCoachAgent',
          practice_interview: 'InterviewAgent',
          create_mock_interview: 'InterviewAgent',
          check_application_status: 'ApplicationStatusAgent',
          faq: 'ResearchAgent',
        };
    
        const agent = agentMap[intent] || 'ResearchAgent';
        const taskId = 'task1';
    
        return {
          tasks: [
            {
              id: taskId,
              type: intent,
              agent,
              parameters: entities,
            },
          ],
          dependencies: new Map(),
          executionOrder: [taskId],
        };
    }

}