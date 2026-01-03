import { Injectable } from '@nestjs/common';
import { BaseAgent } from '../base.agent';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';
import { AgentContext, AgentResult } from '../../types/agent.types';
import { ITool } from '../../interfaces/tool.interface';
import { JobRagService } from '../../../infrastructure/rag/rag-services/job-rag.service';
import { JobToolsService } from '../../../infrastructure/tools/job-tools.service';
import { Intent } from '../../enums/intent.enum';

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
      [Intent.JOB_SEARCH, Intent.JOB_DISCOVERY, Intent.FIND_JOBS],
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
        limit: Math.min(entities?.limit || 10, 10),
      };
      console.log('searchCriteria', JSON.stringify(searchCriteria));

      // Retrieve relevant jobs from RAG
      const ragResults = await this.jobRagService.retrieve(
        searchCriteria.query,
        {
          limit: searchCriteria.limit,
          filters: {
            location: searchCriteria.location,
            skills: searchCriteria.skills,
          },
          context: {
            conversationHistory: context.conversationHistory,
          },
        },
      );

      // Use tools to search if RAG doesn't return enough results
      const searchTool = this.jobTools.getSearchJobsTool();
      const toolResults = await searchTool.execute(searchCriteria);

      // Combine and analyze results with source metadata
      const ragJobs = ragResults.map((r) => {
        // RAG results have job details in metadata, not content
        const jobData = (r.metadata || {}) as Record<string, any>;

        // If content is JSON, try to parse it and merge
        let parsedContent: Record<string, any> = {};
        if (r.content) {
          try {
            if (typeof r.content === 'string') {
              parsedContent = JSON.parse(r.content);
            } else if (typeof r.content === 'object' && r.content !== null) {
              parsedContent = r.content as Record<string, any>;
            }
          } catch {
            // If parsing fails, content is just text - ignore it
          }
        }

        // Merge metadata (from database) with parsed content (if any) and add source info
        return {
          id: jobData.id || parsedContent.id,
          title: jobData.title || parsedContent.title,
          company:
            jobData.company || jobData.companyName || parsedContent.company,
          companyName:
            jobData.companyName || jobData.company || parsedContent.companyName,
          location: jobData.location || parsedContent.location,
          country: jobData.country || parsedContent.country,
          type: jobData.type || parsedContent.type,
          seniorityLevel:
            jobData.seniorityLevel || parsedContent.seniorityLevel,
          organizationId:
            jobData.organizationId || parsedContent.organizationId,
          source: jobData.source || parsedContent.source,
          // Add source metadata
          _source: 'rag',
          _score: r.score,
          // Include any other fields from parsed content
          ...parsedContent,
        };
      });

      const toolJobs = (toolResults.jobs || []).map((job: any) => ({
        ...job,
        _source: 'search_tool',
        _searchMetadata: {
          total: toolResults.total,
          page: toolResults.page,
          totalPages: toolResults.totalPages,
        },
      }));

      const allJobs = [...ragJobs, ...toolJobs];

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
        systemPrompt:
          'You are a career advisor helping users find the best job matches.',
      });

      return this.createSuccessResult(
        {
          jobs: allJobs,
          recommendations,
          totalFound: allJobs.length,
          // Add metadata about sources
          sources: {
            rag: {
              count: ragJobs.length,
              jobs: ragJobs.map((j) => j.id || j.title),
            },
            searchTool: {
              count: toolJobs.length,
              jobs: toolJobs.map((j) => j.id || j.title),
              totalAvailable: toolResults.total,
              page: toolResults.page,
              totalPages: toolResults.totalPages,
            },
          },
        },
        recommendations,
        [
          'View job details',
          'Refine search criteria',
          'Get skill gap analysis',
        ],
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
      intent === Intent.JOB_SEARCH ||
      intent === Intent.FIND_JOBS ||
      intent === Intent.JOB_DISCOVERY ||
      (intent.includes('job') && intent.includes('search'))
    );
  }

  getTools(): ITool[] {
    return this.jobTools.getAllTools();
  }

  getRequiredMemory(): Array<'episodic' | 'semantic' | 'procedural'> {
    return ['episodic', 'semantic'];
  }
}
