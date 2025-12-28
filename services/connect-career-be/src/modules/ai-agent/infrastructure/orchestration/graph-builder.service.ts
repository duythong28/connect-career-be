import { Injectable, Logger } from '@nestjs/common';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { ConfigService } from '@nestjs/config';
import { RoleDetectorService } from './role-detector.service';
import { IntentDetectorService } from './intent-detector.service';
import { AgentRouterService } from './agent-router.service';
import { ChainsService } from '../llm/chains.service';
import { AgentContext } from '../../domain/types/agent.types';
import { PromptService } from '../prompts/prompt.service';

/**
 * Simplified graph builder that avoids strict LangGraph typings.
 * Provides a streamEvents generator compatible with ChatService expectations.
 */
@Injectable()
export class GraphBuilderService {
  private readonly logger = new Logger(GraphBuilderService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly roleDetector: RoleDetectorService,
    private readonly intentDetector: IntentDetectorService,
    private readonly agentRouter: AgentRouterService,
    private readonly chainsService: ChainsService,
    private readonly promptService: PromptService,
  ) {}

  buildGraph(_checkpointer: PostgresSaver) {
    const self = this;
    return {
      async *streamEvents(initialState: any, _config: any) {
        const messages: BaseMessage[] = initialState?.messages || [];
        const lastMessage = messages[messages.length - 1];
        const userText = lastMessage?.content?.toString() || '';

        // ROLE_DETECTOR
        yield { event: 'on_chain_start', name: 'ROLE_DETECTOR' };
        const roleResult = await self.roleDetector.detectRole(
          userText,
          messages.map((m) => ({
            role: m instanceof HumanMessage ? 'user' : 'assistant',
            content: m.content?.toString() || '',
          })),
          initialState?.user_profile,
        );

        // INTENT_ROUTER
        yield { event: 'on_chain_start', name: 'INTENT_ROUTER' };
        const intentResult = await self.intentDetector.detectIntent(
          userText,
          messages.map((m) => ({
            role: m instanceof HumanMessage ? 'user' : 'assistant',
            content: m.content?.toString() || '',
          })),
          initialState?.user_profile,
          roleResult.role,
        );

        // CONTEXT_ANALYZER
        yield { event: 'on_chain_start', name: 'CONTEXT_ANALYZER' };
        yield { event: 'on_chain_start', name: 'SYNC' };

        // Choose subgraph
        const subgraphName =
          roleResult.role === 'recruiter'
            ? 'RECRUITER_SUBGRAPH'
            : 'CANDIDATE_SUBGRAPH';
        yield { event: 'on_chain_start', name: subgraphName };

        // Build agent context and execute
        const context: AgentContext = {
          userId: initialState?.user_profile?.userId || initialState?.thread_id,
          sessionId: initialState?.thread_id,
          task: userText,
          intent: intentResult.intent || 'faq',
          entities: intentResult.entities || {},
          conversationHistory: messages.map((m) => ({
            role: (m instanceof HumanMessage ? 'user' : 'assistant') as
              | 'user'
              | 'assistant'
              | 'system',
            content: m.content?.toString() || '',
          })),
          metadata: initialState?.context_data,
        };

        const agent = await self.agentRouter.routeToAgent(
          intentResult.intent || 'faq',
          context,
        );
        const agentResult = await agent.execute(context);
        console.log('agentResult', JSON.stringify(agentResult));
        yield {
          event: 'on_chain_end',
          name: 'AGENT_RESULT',
          data: { output: agentResult },
        };

        // CONTEXT_BUILDER
        yield { event: 'on_chain_start', name: 'CONTEXT_BUILDER' };

        // ANSWER - Use agent chain with tools instead of simple chain
        yield { event: 'on_chain_start', name: 'ANSWER' };
        const systemPrompt = self.promptService.getGraphBuilderSystemPrompt(
          roleResult.role || 'candidate',
        );

        const contextInfo = agentResult?.data
          ? (() => {
              // If data contains jobs, format them nicely with source metadata
              if (
                agentResult.data.jobs &&
                Array.isArray(agentResult.data.jobs)
              ) {
                const jobsSummary = agentResult.data.jobs
                  .slice(0, 10) // Limit to top 10
                  .map((job: any, index: number) => {
                    const sourceInfo =
                      job._source === 'search_tool'
                        ? `[Found via Search Tool]`
                        : job._source === 'rag'
                          ? `[Found via AI Search]`
                          : '';

                    return `${index + 1}. ${job.title || job.name || 'Job'} at ${job.company || job.companyName || 'Company'} ${sourceInfo}
              - Location: ${job.location || 'Not specified'}
              ${job.description ? `- Description: ${job.description.substring(0, 200)}...` : ''}
              ${job.id ? `- Job ID: ${job.id}` : ''}
              ${job._score ? `- Relevance Score: ${job._score.toFixed(3)}` : ''}`;
                  })
                  .join('\n\n');

                // Add source summary
                const sourceSummary = agentResult.data.sources
                  ? `\n\nSource Summary:
              - AI Search (RAG): ${agentResult.data.sources.rag?.count || 0} jobs
              - Search Tool: ${agentResult.data.sources.searchTool?.count || 0} jobs (${agentResult.data.sources.searchTool?.totalAvailable || 0} total available)`
                  : '';

                return `Jobs Found (${agentResult.data.totalFound || agentResult.data.jobs.length}):${sourceSummary}
                ${jobsSummary}

                ${agentResult.data.recommendations ? `\nRecommendations:\n${agentResult.data.recommendations}` : ''}

                Full data: ${JSON.stringify(agentResult.data, null, 2)}`;
              }

              // For other data types, use JSON
              return JSON.stringify(agentResult.data, null, 2);
            })()
          : undefined;
        const userProfileInfo = initialState?.user_profile
            ? JSON.stringify(initialState.user_profile, null, 2)
            : undefined;
        // Format conversation history for the prompt (last 10 messages for context)
        const recentHistory = messages
          .slice(-10)
          .map((m) => {
            const role = m instanceof HumanMessage ? 'user' : 'assistant';
            const content = m.content?.toString() || '';
            return `${role}: ${content}`;
          })
          .join('\n');

        // Build user prompt
        const userPrompt = self.promptService.getGraphBuilderUserPrompt(
          userText,
          contextInfo,
          userProfileInfo,
          recentHistory,
        );

        // Get agent's tools for tool calling
        const agentTools = agent.getTools();
        console.log('agentTools', JSON.stringify(agentTools));

        let answer: string;

        // If agent has tools, use agent chain (allows LLM to call tools)
        if (agentTools.length > 0) {
          self.logger.log(
            `Using agent chain with ${agentTools.length} tools for ${agent.name}`,
          );

          const agentChain = await self.chainsService.createAgentChain(
            agent,
            agentTools,
            {
              temperature: 0.7,
              maxIterations: 5,
              chatHistory: messages.slice(-10),
              runName: `answer_${agent.name}`,
              metadata: {
                intent: intentResult.intent,
                thread_id: initialState?.thread_id,
              },
            },
          );

          // Use the execute method instead of executor.invoke
          const chainResult = await agentChain.execute(userPrompt, context);
          const finalMessages = chainResult.messages || [];
          const lastMessage = finalMessages[finalMessages.length - 1];
          answer =
            typeof lastMessage?.content === 'string'
              ? lastMessage.content
              : JSON.stringify(lastMessage?.content || chainResult);
          console.log('answer', answer);
        } else {
          // Fallback to simple chain if no tools
          const chain = self.chainsService.createSimpleChain(systemPrompt, {
            temperature: 0.7,
            maxOutputTokens: 4096,
          });
          answer = await chain.execute(userPrompt);
        }

        yield {
          event: 'on_chat_model_stream',
          name: 'ANSWER',
          data: { chunk: { content: answer } },
        };

        const finalMessages = [...messages, new AIMessage(answer)];
        yield {
          event: 'on_chain_end',
          name: 'LangGraph',
          data: { output: { messages: finalMessages } },
        };
      },
    };
  }

  async getCheckpointer(): Promise<PostgresSaver> {
    const host = this.configService.get<string>('DATABASE_HOST') || 'localhost';
    const port = this.configService.get<string>('DATABASE_PORT') || '5432';
    const username =
      this.configService.get<string>('DATABASE_USERNAME') || 'postgres';
    const password =
      this.configService.get<string>('DATABASE_PASSWORD') || 'postgres';
    const database =
      this.configService.get<string>('DATABASE_NAME') || 'connect_career';

    const connectionString = `postgresql://${username}:${password}@${host}:${port}/${database}`;
    return await PostgresSaver.fromConnString(connectionString);
  }
}
