import { Injectable, Logger } from '@nestjs/common';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { ConfigService } from '@nestjs/config';
import { RoleDetectorService } from './role-detector.service';
import { IntentDetectorService } from './intent-detector.service';
import { AgentRouterService } from './agent-router.service';
import { ChainsService } from '../llm/chains.service';
import { AgentContext } from '../../domain/types/agent.types';

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
          roleResult.role === 'recruiter' ? 'RECRUITER_SUBGRAPH' : 'CANDIDATE_SUBGRAPH';
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

        // CONTEXT_BUILDER
        yield { event: 'on_chain_start', name: 'CONTEXT_BUILDER' };

        // ANSWER
        yield { event: 'on_chain_start', name: 'ANSWER' };
        const systemPrompt = `You are a helpful career assistant.
${roleResult.role === 'recruiter'
  ? 'You help recruiters with hiring tasks, candidate screening, and job posting.'
  : 'You help job seekers find jobs, improve their CVs, and advance their careers.'}

Generate a helpful, natural response based on the context provided.`;

        const contextInfo = agentResult?.data
          ? `\n\nContext:\n${JSON.stringify(agentResult.data, null, 2)}`
          : '';
        const prompt = `User: ${userText}${contextInfo}\n\nGenerate a helpful response.`;
        const chain = self.chainsService.createSimpleChain(systemPrompt, {
          temperature: 0.7,
          maxOutputTokens: 2048,
        });
        const answer = await chain.execute(prompt);

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
    const username = this.configService.get<string>('DATABASE_USERNAME') || 'postgres';
    const password = this.configService.get<string>('DATABASE_PASSWORD') || 'postgres';
    const database = this.configService.get<string>('DATABASE_NAME') || 'connect_career';

    const connectionString = `postgresql://${username}:${password}@${host}:${port}/${database}`;
    return await PostgresSaver.fromConnString(connectionString);
  }
}

