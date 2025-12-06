import { Injectable } from '@nestjs/common';
import { BaseAgent } from '../base.agent';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';
import { AgentContext, AgentResult } from '../../types/agent.types';
import { ITool } from '../../interfaces/tool.interface';
import { FaqRagService } from '../../../infrastructure/rag/rag-services/faq-rag.service';

@Injectable()
export class FaqAgent extends BaseAgent {
  constructor(
    aiService: AIService,
    private readonly faqRagService: FaqRagService,
  ) {
    super(
      aiService,
      'FaqAgent',
      'Answers frequently asked questions using knowledge base',
      ['faq', 'question', 'help', 'information'],
    );
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { task } = context;

      // Retrieve relevant FAQs
      const faqResults = await this.faqRagService.retrieve(task, {
        limit: 5,
        context: {
          conversationHistory: context.conversationHistory,
        },
      });

      if (faqResults.length === 0) {
        return this.createSuccessResult(
          { answer: 'I could not find a specific answer to your question.' },
          'I could not find a specific answer to your question. Could you please rephrase or provide more details?',
          ['Try rephrasing', 'Contact support'],
        );
      }

      // Use the top result as the answer
      const topAnswer = faqResults[0];
      const answer = topAnswer.metadata?.answer || topAnswer.content;

      // Generate a natural response
      const responsePrompt = `Answer the user's question based on this FAQ:

Question: ${task}
Answer: ${answer}

Provide a clear, helpful response.`;

      const response = await this.callLLM(responsePrompt, {
        systemPrompt: 'You are a helpful assistant providing clear, concise answers.',
      });

      return this.createSuccessResult(
        {
          answer: response,
          source: topAnswer.metadata,
          relatedFaqs: faqResults.slice(1, 3),
        },
        response,
        faqResults.length > 1 ? ['See related questions'] : [],
      );
    } catch (error) {
      return this.createErrorResult(
        [error instanceof Error ? error : new Error(String(error))],
        'Failed to answer question.',
      );
    }
  }

  canHandle(intent: string, entities?: Record<string, any>): boolean {
    return (
      intent === 'faq' ||
      intent === 'question' ||
      intent === 'help' ||
      intent.includes('what') ||
      intent.includes('how') ||
      intent.includes('explain')
    );
  }

  getTools(): ITool[] {
    return [];
  }

  getRequiredMemory(): Array<'episodic' | 'semantic' | 'procedural'> {
    return ['semantic'];
  }
}