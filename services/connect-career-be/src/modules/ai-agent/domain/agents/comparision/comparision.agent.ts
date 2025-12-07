import { Injectable } from '@nestjs/common';
import { BaseAgent } from '../base.agent';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';
import { AgentContext, AgentResult } from '../../types/agent.types';
import { ITool } from '../../interfaces/tool.interface';
import { MultiRagService } from '../../../infrastructure/rag/rag-services/multi-rag.service';
import { Intent } from '../../enums/intent.enum';

@Injectable()
export class ComparisonAgent extends BaseAgent {
  constructor(
    aiService: AIService,
    private readonly multiRagService: MultiRagService,
  ) {
    super(
      aiService,
      'ComparisonAgent',
      'Compares jobs, companies, offers, or learning resources side-by-side',
      [Intent.COMPARISON],
    );
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { task, entities } = context;

      // Extract comparison items from entities
      const itemsToCompare = entities?.items || [];
      const comparisonType = entities?.type || 'general';

      if (itemsToCompare.length < 2) {
        return this.createErrorResult(
          [new Error('Need at least 2 items to compare')],
          'Please provide at least 2 items to compare.',
        );
      }

      // Retrieve relevant information for each item
      const comparisonData = await Promise.all(
        itemsToCompare.map(async (item: any) => {
          const domains: Array<'job' | 'company' | 'learning' | 'faq'> = [];

          if (comparisonType === 'job' || item.type === 'job') {
            domains.push('job');
          } else if (comparisonType === 'company' || item.type === 'company') {
            domains.push('company');
          } else if (
            comparisonType === 'learning' ||
            item.type === 'learning'
          ) {
            domains.push('learning');
          }

          const ragResults = await this.multiRagService.retrieve(
            item.name || item.id || JSON.stringify(item),
            domains.length > 0 ? domains : ['job', 'company', 'learning'],
            { limitPerDomain: 1 },
          );

          return {
            item,
            data: (() => {
              const firstResult = ragResults.results[0];
              if (!firstResult) return item;
              try {
                return typeof firstResult.content === 'string'
                  ? JSON.parse(firstResult.content)
                  : firstResult.content;
              } catch {
                return firstResult.content;
              }
            })(),
          };
        }),
      );

      // Generate comparison using LLM
      const comparisonPrompt = `Compare the following items and provide a structured comparison:

Items to compare:
${comparisonData.map((item, idx) => `${idx + 1}. ${JSON.stringify(item.data, null, 2)}`).join('\n\n')}

Provide a comparison with:
1. Similarities
2. Differences
3. Pros and cons for each
4. Recommendations`;

      const comparison = await this.callLLM(comparisonPrompt, {
        systemPrompt:
          'You are an expert at comparing and analyzing different options. Provide clear, structured comparisons.',
      });

      return this.createSuccessResult(
        {
          items: comparisonData,
          comparison,
          type: comparisonType,
        },
        comparison,
        ['Review the comparison', 'Ask for more details on any item'],
      );
    } catch (error) {
      return this.createErrorResult(
        [error instanceof Error ? error : new Error(String(error))],
        'Failed to perform comparison.',
      );
    }
  }

  canHandle(intent: string, entities?: Record<string, any>): boolean {
    return (
      intent === Intent.COMPARE_JOBS ||
      intent === Intent.COMPARE_COMPANIES ||
      intent === Intent.COMPARE_OFFERS ||
      intent === Intent.COMPARISON ||
      intent.includes('compare') ||
      intent.includes('comparison')
    );
  }

  getTools(): ITool[] {
    return [];
  }

  getRequiredMemory(): Array<'episodic' | 'semantic' | 'procedural'> {
    return ['semantic'];
  }
}
