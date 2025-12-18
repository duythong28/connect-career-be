import { Injectable, Logger } from '@nestjs/common';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { ConfigService } from '@nestjs/config';
import { StateGraph, END, START } from '@langchain/langgraph';
import { Annotation } from '@langchain/langgraph';
import { RoleDetectorService } from './role-detector.service';
import { IntentDetectorService } from './intent-detector.service';
import { AgentRouterService } from './agent-router.service';
import { ChainsService } from '../llm/chains.service';
import { AgentContext, AgentResult } from '../../domain/types/agent.types';
import { PromptService } from '../prompts/prompt.service';
import { UserRole } from '../../domain/types/agent-state.type';

// Define the graph state schema
const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
    default: () => [],
  }),
  role: Annotation<UserRole | undefined>(),
  intent: Annotation<string | undefined>(),
  entities: Annotation<Record<string, any>>({
    reducer: (x: Record<string, any>, y: Record<string, any>) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  context: Annotation<AgentContext | undefined>(),
  agent: Annotation<any>(), // Add agent to state to avoid re-routing
  agentResult: Annotation<AgentResult | undefined>(),
  answer: Annotation<string | undefined>(),
  error: Annotation<string | undefined>(),
  user_profile: Annotation<any>(),
  thread_id: Annotation<string | undefined>({
    value: (x: string | undefined, y: string | undefined) => x || y || 'unknown-thread',
    default: () => 'unknown-thread',
  }),
  context_data: Annotation<Record<string, any>>({
    reducer: (x: Record<string, any>, y: Record<string, any>) => ({ ...x, ...y }),
    default: () => ({}),
  }),
});

type GraphStateType = typeof GraphState.State;

/**
 * Proper LangGraph StateGraph implementation with checkpointing and error recovery.
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

  /**
   * Format conversation history for prompts (extracted helper)
   */
  private formatHistory(
    messages: BaseMessage[],
    max: number = 10,
  ): string {
    return messages
      .slice(-max)
      .map((m) => {
        const role = m instanceof HumanMessage ? 'User' : 'Assistant';
        const content = m.content?.toString() || '';
        return `${role}: ${content}`;
      })
      .join('\n');
  }

  /**
   * Format messages for role/intent detection
   */
  private formatMessagesForDetection(messages: BaseMessage[]): Array<{
    role: 'user' | 'assistant';
    content: string;
  }> {
    return messages.map((m) => ({
      role: m instanceof HumanMessage ? 'user' : 'assistant',
      content: m.content?.toString() || '',
    }));
  }

  /**
   * Role Detector Node
   */
  private async roleDetectorNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
    try {
      const messages = state.messages || [];
      const lastMessage = messages[messages.length - 1];
      const userText = lastMessage?.content?.toString() || '';

      const roleResult = await this.roleDetector.detectRole(
        userText,
        this.formatMessagesForDetection(messages),
        state.user_profile,
      );

      return {
        role: roleResult.role,
      };
    } catch (error) {
      this.logger.error(
        `Role detection failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Default to candidate on error
      return {
        role: 'candidate' as UserRole,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Intent Router Node
   */
  private async intentRouterNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
    try {
      const messages = state.messages || [];
      const lastMessage = messages[messages.length - 1];
      const userText = lastMessage?.content?.toString() || '';

      // Type assertion for role - ensure it's the correct type
      const role: 'candidate' | 'recruiter' | undefined = 
        state.role === 'candidate' || state.role === 'recruiter' 
          ? state.role 
          : undefined;

      const intentResult = await this.intentDetector.detectIntent(
        userText,
        this.formatMessagesForDetection(messages),
        state.user_profile,
        role,
      );

      return {
        intent: intentResult.intent || 'faq',
        entities: intentResult.entities || {},
      };
    } catch (error) {
      this.logger.error(
        `Intent detection failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Default to FAQ on error
      return {
        intent: 'faq',
        entities: {},
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Context Builder Node
   */
  private async contextBuilderNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
    try {
      const messages = state.messages || [];
      const lastMessage = messages[messages.length - 1];
      const userText = lastMessage?.content?.toString() || '';

      // Ensure thread_id is not undefined for sessionId
      const sessionId = state.thread_id || 'unknown-session';

      const context: AgentContext = {
        userId: state.user_profile?.userId || sessionId,
        sessionId: sessionId,
        task: userText,
        intent: state.intent || 'faq',
        entities: state.entities || {},
        conversationHistory: this.formatMessagesForDetection(messages).map((m) => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        })),
        metadata: state.context_data,
      };

      return { context };
    } catch (error) {
      this.logger.error(
        `Context building failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Agent Executor Node
   */
  private async agentExecutorNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
    try {
      if (!state.context) {
        throw new Error('Context not available for agent execution');
      }

      const agent = await this.agentRouter.routeToAgent(
        state.intent || 'faq',
        state.context,
      );

      const agentResult = await agent.execute(state.context);

      // Store agent in state to reuse in answerGeneratorNode
      return { 
        agentResult,
        agent, // Store agent in state
      };
    } catch (error) {
      this.logger.error(
        `Agent execution failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        error: error instanceof Error ? error.message : String(error),
        agentResult: {
          success: false,
          data: null,
          explanation: `Agent execution failed: ${error instanceof Error ? error.message : String(error)}`,
        } as AgentResult,
      };
    }
  }

  /**
   * Answer Generator Node (with fallback logic)
   */
  private async answerGeneratorNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
    try {
      const messages = state.messages || [];
      const lastMessage = messages[messages.length - 1];
      const userText = lastMessage?.content?.toString() || '';

      // Type assertion for role
      const role: 'candidate' | 'recruiter' = 
        state.role === 'recruiter' ? 'recruiter' : 'candidate';

      const systemPrompt = this.promptService.getGraphBuilderSystemPrompt(role);

      const contextInfo = state.agentResult?.data
        ? JSON.stringify(state.agentResult.data, null, 2)
        : undefined;

      const userProfileInfo = state.user_profile
        ? JSON.stringify(state.user_profile, null, 2)
        : undefined;

      const recentHistory = this.formatHistory(messages, 10);

      const userPrompt = this.promptService.getGraphBuilderUserPrompt(
        userText,
        contextInfo,
        userProfileInfo,
        recentHistory,
      );

      // Reuse agent from state (already routed in agentExecutorNode)
      const agent = state.agent;
      const agentTools = agent?.getTools() || [];
      let answer: string;

      // Try agent chain with tools, fallback to simple chain
      if (agentTools.length > 0 && agent) {
        try {
          this.logger.log(`Using agent chain with ${agentTools.length} tools for ${agent.name}`);

          const agentChain = await this.chainsService.createAgentChain(
            agent,
            agentTools,
            {
              temperature: 0.7,
              maxIterations: 5,
              chatHistory: messages.slice(-10),
              runName: `answer_${agent.name}`,
              metadata: {
                intent: state.intent,
                thread_id: state.thread_id,
              },
            },
          );

          // Fix: Use correct format for agent executor (input/chat_history, not messages)
          const allMessages = [
            ...messages.slice(-10),
            new HumanMessage(userPrompt),
          ];

          // Execute with max iterations
          const maxIterations = 5;
          const config = {
            recursionLimit: maxIterations,
          };

          const chainResult = await agentChain.executor.invoke(
            { messages: allMessages },
            config,
          );
          

          // Extract output from result
          // The result format depends on the executor type
          if (typeof chainResult.structuredResponse === 'string') {
            answer = chainResult.structuredResponse;
          } else if (chainResult.messages && chainResult.messages.length > 0) {
            const lastMsg = chainResult.messages[chainResult.messages.length - 1];
            answer = typeof lastMsg?.content === 'string'
              ? lastMsg.content
              : JSON.stringify(lastMsg?.content || chainResult);
          } else {
            answer = JSON.stringify(chainResult);
          }
        } catch (agentError) {
          // Fallback to simple chain
          this.logger.warn(
            `Agent chain failed, falling back to simple chain: ${agentError instanceof Error ? agentError.message : String(agentError)}`,
          );

          const toolDescriptions = agentTools
            .map((tool) => `- ${tool.name}: ${tool.description}`)
            .join('\n');

          const enhancedSystemPrompt = `${systemPrompt}

Available tools (note: tools are not directly callable in simple mode, but you can reference them):
${toolDescriptions}`;

          answer = await this.executeSimpleChain(
            enhancedSystemPrompt,
            userPrompt,
            messages,
            state,
            true,
          );
        }
      } else {
        // No tools, use simple chain
        answer = await this.executeSimpleChain(
          systemPrompt,
          userPrompt,
          messages,
          state,
          false,
        );
      }

      // Add answer to messages
      const answerMessage = new AIMessage(answer);
      const updatedMessages = [...messages, answerMessage];

      return {
        answer,
        messages: updatedMessages,
      };
    } catch (error) {
      this.logger.error(
        `Answer generation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      const errorMessage = `I apologize, but I encountered an error while generating a response. Please try again.`;
      const errorAIMessage = new AIMessage(errorMessage);
      return {
        answer: errorMessage,
        messages: [...(state.messages || []), errorAIMessage],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Execute simple chain (extracted helper)
   */
  private async executeSimpleChain(
    systemPrompt: string,
    userPrompt: string,
    messages: BaseMessage[],
    state: GraphStateType,
    isFallback: boolean,
  ): Promise<string> {
    const chain = this.chainsService.createSimpleChain(systemPrompt, {
      temperature: 0.7,
      maxOutputTokens: 4096,
      runName: isFallback ? `simple_fallback_${state.intent}` : `simple_${state.intent}`,
      metadata: {
        intent: state.intent,
        thread_id: state.thread_id,
        fallback: isFallback,
      },
    });

    const historyContext = this.formatHistory(messages, 10);
    const contextualPrompt = historyContext
      ? `Previous conversation:\n${historyContext}\n\nCurrent question: ${userPrompt}`
      : userPrompt;

    return await chain.execute(contextualPrompt);
  }

  /**
   * Build proper LangGraph StateGraph with checkpointing
   */
  buildGraph(checkpointer: PostgresSaver) {
    const compiledGraph = new StateGraph(GraphState)
      .addNode('role_detector', this.roleDetectorNode.bind(this))
      .addNode('intent_router', this.intentRouterNode.bind(this))
      .addNode('context_builder', this.contextBuilderNode.bind(this))
      .addNode('agent_executor', this.agentExecutorNode.bind(this))
      .addNode('answer_generator', this.answerGeneratorNode.bind(this))

      // Define edges
      .addEdge(START, 'role_detector')
      .addEdge('role_detector', 'intent_router')
      .addEdge('intent_router', 'context_builder')
      .addEdge('context_builder', 'agent_executor')
      .addEdge('agent_executor', 'answer_generator')
      .addEdge('answer_generator', END)

      // Compile with checkpointer - return directly, no wrapper
      .compile({ checkpointer });

    return compiledGraph;
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
    const checkpointer = await PostgresSaver.fromConnString(connectionString, {
      schema: 'public',
    });
    try {
      await checkpointer.setup();
      this.logger.log('LangGraph checkpointer tables initialized successfully');
    } catch (error) {
      this.logger.warn(
        `Failed to setup checkpointer tables (may already exist): ${error instanceof Error ? error.message : String(error)}`,
      );
      // Continue anyway - tables might already exist
    }

    return checkpointer;
  
  }
}