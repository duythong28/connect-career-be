import { Injectable } from '@nestjs/common';
import { BaseAgent } from '../base.agent';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';
import { AgentContext, AgentResult } from '../../types/agent.types';
import { ITool } from '../../interfaces/tool.interface';
import { JobRagService } from '../../../infrastructure/rag/rag-services/job-rag.service';
import { JobToolsService } from '../../../infrastructure/tools/job-tools.service';

@Injectable()
export class JobDiscoveryAgent extends BaseAgent {
  constructor(
    aiService: AIService,
    private readonly jobRagService: JobRagService,
    private readonly jobTools: JobToolsService,
  ) {
    super(
      aiService,
      'JobDiscoveryAgent',
      'Discovers and recommends jobs based on user preferences and skills',
      ['job_search', 'job_discovery', 'find_jobs'],
    );
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { task, entities } = context;

      // Extract search criteria
      const searchCriteria = {
        query: entities?.query || entities?.jobTitle || task,
        location: entities?.location,
        skills: entities?.skills || [],
        limit: entities?.limit || 10,
      };

      // Retrieve relevant jobs from RAG
      const ragResults = await this.jobRagService.retrieve(searchCriteria.query, {
        limit: searchCriteria.limit,
        filters: {
          location: searchCriteria.location,
          skills: searchCriteria.skills,
        },
        context: {
          conversationHistory: context.conversationHistory,
        },
      });

      // Use tools to search if RAG doesn't return enough results
      const searchTool = this.jobTools.getSearchJobsTool();
      const toolResults = await searchTool.execute(searchCriteria);

      // Combine and analyze results
      const allJobs = [
        ...ragResults.map(r => {
          try {
            return typeof r.content === 'string' ? JSON.parse(r.content) : r.content;
          } catch {
            return r.content;
          }
        }),
        ...(toolResults.jobs || []),
      ];

      // Generate recommendations
      const recommendationPrompt = `Based on the following job listings, provide personalized recommendations:

Jobs found:
${JSON.stringify(allJobs.slice(0, 10), null, 2)}

User context: ${JSON.stringify(entities || {})}

Provide:
1. Top 3 recommended jobs with reasons
2. Skills gap analysis if applicable
3. Suggestions for improving job search`;

      const recommendations = await this.callLLM(recommendationPrompt, {
        systemPrompt: 'You are a career advisor helping users find the best job matches.',
      });

      return this.createSuccessResult(
        {
          jobs: allJobs,
          recommendations,
          totalFound: allJobs.length,
        },
        recommendations,
        ['View job details', 'Refine search criteria', 'Get skill gap analysis'],
      );
    } catch (error) {
      return this.createErrorResult(
        [error instanceof Error ? error : new Error(String(error))],
        'Failed to discover jobs.',
      );
    }
  }

  canHandle(intent: string, entities?: Record<string, any>): boolean {
    return (
      intent === 'job_search' ||
      intent === 'find_jobs' ||
      intent === 'job_discovery' ||
      intent.includes('job') && intent.includes('search')
    );
  }

  getTools(): ITool[] {
    return this.jobTools.getAllTools();
  }

  getRequiredMemory(): Array<'episodic' | 'semantic' | 'procedural'> {
    return ['episodic', 'semantic'];
  }
}