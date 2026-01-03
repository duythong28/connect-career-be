import { Injectable } from '@nestjs/common';
import { BaseAgent } from '../base.agent';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';
import { AgentContext, AgentResult } from '../../types/agent.types';
import { ITool } from '../../interfaces/tool.interface';
import { CompanyRagService } from '../../../infrastructure/rag/rag-services/company-rag.service';
import { Intent } from '../../enums/intent.enum';

@Injectable()
export class OrganizationCultureAgent extends BaseAgent {
  constructor(
    aiService: AIService,
    private readonly companyRagService: CompanyRagService,
  ) {
    super(
      aiService,
      'OrganizationCultureAgent',
      'Provides information about company culture, values, work environment, and employee experience',
      [
        Intent.COMPANY_RESEARCH,
        'company_culture',
        'company_tour',
        'work_culture',
        'company_values',
        'employee_experience',
      ],
    );
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { task, entities } = context;

      // Extract company name or search query
      const companyName =
        entities?.companyName ||
        entities?.company ||
        entities?.organization ||
        this.extractCompanyName(task);

      const searchQuery = companyName || task;

      // Retrieve company information from RAG
      const ragResults = await this.companyRagService.retrieve(searchQuery, {
        limit: 5,
        filters: {
          industry: entities?.industry,
          size: entities?.companySize,
          location: entities?.location,
        },
        context: {
          conversationHistory: context.conversationHistory,
        },
      });

      // Extract company information from RAG results
      const companyInfo = ragResults.map((result) => {
        try {
          return typeof result.content === 'string'
            ? JSON.parse(result.content)
            : result.content;
        } catch {
          return {
            text: result.content,
            metadata: result.metadata,
          };
        }
      });

      // Generate comprehensive culture overview
      const culturePrompt = `Based on the following company information, provide a comprehensive overview of the company culture:

Company Information:
${JSON.stringify(companyInfo, null, 2)}

User Query: ${task}

Provide:
1. **Company Overview**: Brief introduction to the company
2. **Core Values**: What the company stands for
3. **Work Culture**: Day-to-day work environment and practices
4. **Team Structure**: How teams are organized
5. **Benefits & Perks**: Employee benefits and unique offerings
6. **Growth Opportunities**: Career development and learning culture
7. **Work-Life Balance**: Policies and practices
8. **Diversity & Inclusion**: Company's approach to DEI
9. **What Makes It Unique**: Standout aspects of the culture
10. **Day in the Life**: Example of a typical workday

Format the response in an engaging, informative way. If specific information is not available, mention that and provide general insights based on industry standards.`;

      const cultureOverview = await this.callLLM(culturePrompt, {
        systemPrompt:
          "You are a company culture expert helping candidates understand what it's like to work at different organizations. Be honest, engaging, and informative.",
      });

      return this.createSuccessResult(
        {
          companyName: companyName || 'Unknown',
          companyInfo,
          cultureOverview,
          sources: ragResults.map((r) => ({
            content: r.content,
            metadata: r.metadata,
            score: r.score,
          })),
        },
        cultureOverview,
        [
          'Learn more about specific teams',
          'Ask about work-life balance',
          'Explore career growth opportunities',
          'Compare with other companies',
        ],
        {
          companyName: companyName || null,
          resultsFound: ragResults.length,
        },
      );
    } catch (error) {
      return this.createErrorResult(
        [error instanceof Error ? error : new Error(String(error))],
        'Failed to retrieve company culture information. Please try again.',
      );
    }
  }

  canHandle(intent: string, entities?: Record<string, any>): boolean {
    return (
      intent === Intent.COMPANY_RESEARCH ||
      intent === 'company_culture' ||
      intent === 'company_tour' ||
      intent === 'work_culture' ||
      intent === 'company_values' ||
      intent === 'employee_experience' ||
      (intent.includes('company') &&
        (intent.includes('culture') ||
          intent.includes('tour') ||
          intent.includes('values'))) ||
      (intent.includes('work') && intent.includes('culture'))
    );
  }

  getTools(): ITool[] {
    return []; // RAG service handles retrieval, no additional tools needed
  }

  getRequiredMemory(): Array<'episodic' | 'semantic' | 'procedural'> {
    return ['episodic', 'semantic'];
  }

  private extractCompanyName(text: string): string | null {
    // Simple extraction - can be enhanced with NER
    const patterns = [
      /(?:at|from|in|with)\s+([A-Z][a-zA-Z\s&]+?)(?:\s|$|,|\.)/,
      /company\s+([A-Z][a-zA-Z\s&]+?)(?:\s|$|,|\.)/,
      /([A-Z][a-zA-Z\s&]{2,})\s+(?:culture|values|tour|environment)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }
}
