import { Injectable, Logger, Optional } from '@nestjs/common';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';
import { IAgent } from '../../domain/interfaces/agent.interface';
import { ITool } from '../../domain/interfaces/tool.interface';
import { AgentContext } from '../../domain/types/agent.types';
import { ConfigService } from '@nestjs/config';

import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { RunnableSequence } from '@langchain/core/runnables';
// StateGraph and END removed - using simplified workflow implementation
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatGeneration, ChatResult } from '@langchain/core/outputs';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';

// LangSmith imports
import { Client } from 'langsmith';

// LangChain Agent imports - try different paths
let createOpenAIFunctionsAgent: any;
let AgentExecutor: any;

try {
  // Try the main langchain package first
  const langchainAgents = require('langchain/agents');
  createOpenAIFunctionsAgent = langchainAgents.createOpenAIFunctionsAgent;
  AgentExecutor = langchainAgents.AgentExecutor;
} catch {
  try {
    // Fallback to @langchain/agents if available
    const langchainAgents = require('@langchain/agents');
    createOpenAIFunctionsAgent = langchainAgents.createOpenAIFunctionsAgent;
    AgentExecutor = langchainAgents.AgentExecutor;
  } catch {
    // If neither works, we'll create a fallback implementation
    console.warn('LangChain agents not found, using fallback implementation');
  }
}


// Custom LLM adapter that properly extends BaseChatModel
class CustomLLMAdapter extends BaseChatModel {
  private aiService: AIService;

  constructor(aiService: AIService) {
    super({});
    this.aiService = aiService;
  }

  _llmType(): string {
    return 'custom';
  }

  async _generate(
    messages: BaseMessage[],
    options?: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun,
  ): Promise<ChatResult> {
    const formattedMessages: Array<{
      role: 'user' | 'assistant' | 'system';
      content: string;
    }> = messages.map(msg => ({
      role: msg instanceof HumanMessage ? 'user' as const : 
            msg instanceof AIMessage ? 'assistant' as const : 
            msg instanceof SystemMessage ? 'system' as const : 'user' as const,
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
    }));

    const response = await this.aiService.chat({
      messages: formattedMessages,
      temperature: (options as any)?.temperature || 0.7,
      maxOutputTokens: 2048,
    });

    const message = new AIMessage(response.content);
    
    return {
      generations: [
        {
          message,
          text: response.content,
        } as ChatGeneration,
      ],
    };
  }

  // Required for streaming support
  _streamResponseChunks(
    _messages: BaseMessage[],
    _options?: this['ParsedCallOptions'],
    _runManager?: CallbackManagerForLLMRun,
  ): AsyncGenerator<any> {
    throw new Error('Streaming not implemented');
  }
}

@Injectable()
export class ChainsService {
  private readonly logger = new Logger(ChainsService.name);
  private readonly llmAdapter: CustomLLMAdapter;
  private readonly langsmithClient?: Client;
  private readonly langsmithEnabled: boolean;
  private readonly langsmithProject: string;

  constructor(
    private readonly aiService: AIService,
    @Optional() private readonly configService?: ConfigService,
  ) {
    this.llmAdapter = new CustomLLMAdapter(aiService);

    // Initialize LangSmith if API key is provided
    const langsmithApiKey = this.configService?.get<string>('LANGSMITH_API_KEY');
    this.langsmithProject = this.configService?.get<string>('LANGSMITH_PROJECT') || 'connect-career-ai-agent';

    if (langsmithApiKey) {
      try {
        this.langsmithClient = new Client({
          apiKey: langsmithApiKey,
        });

        this.langsmithEnabled = true;
        this.logger.log(`LangSmith monitoring enabled for project: ${this.langsmithProject}`);
      } catch (error) {
        this.logger.warn(`Failed to initialize LangSmith: ${error}`);
        this.langsmithEnabled = false;
      }
    } else {
      this.langsmithEnabled = false;
      this.logger.debug('LangSmith API key not found - monitoring disabled');
    }
  }

  /**
   * Convert ITool to LangChain DynamicStructuredTool
   */
  private convertToolToLangChain(tool: ITool): DynamicStructuredTool {
    // Convert parameters to Zod schema
    const schemaObject: Record<string, z.ZodTypeAny> = {};
    
    for (const param of tool.parameters) {
      let zodType: z.ZodTypeAny;
      
      switch (param.type) {
        case 'string':
          zodType = z.string();
          break;
        case 'number':
          zodType = z.number();
          break;
        case 'boolean':
          zodType = z.boolean();
          break;
        case 'array':
          zodType = z.array(z.any());
          break;
        case 'object':
          zodType = z.record(z.string(), z.any());
          break;
        default:
          zodType = z.any();
      }

      if (param.required) {
        schemaObject[param.name] = zodType;
      } else {
        schemaObject[param.name] = zodType.optional();
      }
    }

    const zodSchema = z.object(schemaObject);

    return new DynamicStructuredTool({
      name: tool.name,
      description: tool.description,
      schema: zodSchema,
      func: async (params: Record<string, any>) => {
        try {
          const result = await tool.execute(params);
          return typeof result === 'string' ? result : JSON.stringify(result);
        } catch (error) {
          this.logger.error(`Tool ${tool.name} execution failed: ${error}`);
          throw error;
        }
      },
    });
  }

  /**
   * Create an agent chain with tools using LangChain
   */
  async createAgentChain(
    agent: IAgent,
    tools: ITool[],
    options?: {
      temperature?: number;
      maxIterations?: number;
      chatHistory?: BaseMessage[];
      runName?: string;
      metadata?: Record<string, any>;
    },
  ) {
    try {
      // Convert tools to LangChain format
      const langChainTools = tools.map(tool => this.convertToolToLangChain(tool));

      // Create system prompt
      const systemPrompt = `You are ${agent.name}: ${agent.description}

Your capabilities: ${agent.capabilities.join(', ')}

You have access to the following tools. Use them when needed to complete tasks.
Always explain what you're doing and why.`;

      // Create prompt template
      const prompt = ChatPromptTemplate.fromMessages([
        ['system', systemPrompt],
        new MessagesPlaceholder('chat_history'),
        ['human', '{input}'],
        new MessagesPlaceholder('agent_scratchpad'),
      ]);

      // LangSmith callbacks will be handled via manual tracing

      // Create agent using OpenAI functions format
      if (!createOpenAIFunctionsAgent) {
        throw new Error('createOpenAIFunctionsAgent not available. Please install langchain package.');
      }

      const agentChain = await createOpenAIFunctionsAgent({
        llm: this.llmAdapter,
        tools: langChainTools,
        prompt,
      });

      // Create executor
      if (!AgentExecutor) {
        throw new Error('AgentExecutor not available. Please install langchain package.');
      }

      const executor = new AgentExecutor({
        agent: agentChain,
        tools: langChainTools,
        verbose: true,
        maxIterations: options?.maxIterations || 15,
        returnIntermediateSteps: true,
      });

      return {
        agent,
        tools: langChainTools,
        executor,
        execute: async (input: string, context?: AgentContext) => {
          let traceId: string | undefined;
          const startTime = Date.now();

          try {
            const chatHistory = options?.chatHistory || [];

            // Start LangSmith trace if enabled
            if (this.langsmithEnabled && this.langsmithClient) {
              try {
                const trace = await this.langsmithClient.createRun({
                  name: options?.runName || `${agent.name}_execution`,
                  run_type: 'chain',
                  inputs: {
                    input,
                    agentName: agent.name,
                    context: context ? JSON.stringify(context) : undefined,
                    toolCount: tools.length,
                    ...options?.metadata,
                  },
                  project_name: this.langsmithProject,
                });
                traceId = typeof trace === 'string' ? trace : (trace as any).id;
              } catch (traceError) {
                this.logger.warn(`Failed to create LangSmith trace: ${traceError}`);
              }
            }

            const result = await executor.invoke({
              input,
              chat_history: chatHistory,
            });

            const executionTime = Date.now() - startTime;

            // Update LangSmith trace with results
            if (this.langsmithEnabled && this.langsmithClient && traceId) {
              try {
                await this.langsmithClient.updateRun(traceId, {
                  outputs: {
                    output: result.output,
                    intermediateSteps: result.intermediateSteps?.length || 0,
                    executionTime,
                    success: true,
                  },
                  end_time: Date.now(),
                });
              } catch (updateError) {
                this.logger.warn(`Failed to update LangSmith trace: ${updateError}`);
              }
            }

            return {
              output: result.output,
              intermediateSteps: result.intermediateSteps,
              traceId,
              executionTime,
            };
          } catch (error) {
            const executionTime = Date.now() - startTime;

            // Log error to LangSmith
            if (this.langsmithEnabled && this.langsmithClient && traceId) {
              try {
                await this.langsmithClient.updateRun(traceId, {
                  error: error instanceof Error ? error.message : String(error),
                  end_time: Date.now(),
                  outputs: {
                    executionTime,
                    success: false,
                  },
                });
              } catch (updateError) {
                this.logger.warn(`Failed to update LangSmith trace with error: ${updateError}`);
              }
            }

            this.logger.error(`Agent chain execution failed: ${error}`, error instanceof Error ? error.stack : undefined);
            throw error;
          }
        },
      };
    } catch (error) {
      this.logger.error(`Failed to create agent chain: ${error}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  /**
   * Create a simple chain (without tools)
   */
  createSimpleChain(
    systemPrompt: string,
    options?: {
      temperature?: number;
      maxOutputTokens?: number;
      runName?: string;
      metadata?: Record<string, any>;
    },
  ) {
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', systemPrompt],
      ['human', '{input}'],
    ]);

    const chain = RunnableSequence.from([
      prompt,
      this.llmAdapter,
    ]);

    return {
      execute: async (input: string) => {
        let traceId: string | undefined;
        const startTime = Date.now();

        try {
          // Start LangSmith trace if enabled
          if (this.langsmithEnabled && this.langsmithClient) {
            try {
              const trace = await this.langsmithClient.createRun({
                name: options?.runName || 'simple_chain',
                run_type: 'chain',
                inputs: { 
                  input,
                  ...options?.metadata,
                },
                project_name: this.langsmithProject,
              });
              traceId = typeof trace === 'string' ? trace : (trace as any).id;
            } catch (traceError) {
              this.logger.warn(`Failed to create LangSmith trace: ${traceError}`);
            }
          }

          const result = await chain.invoke({ input });
          const executionTime = Date.now() - startTime;

          // Update LangSmith trace
          if (this.langsmithEnabled && this.langsmithClient && traceId) {
            try {
              await this.langsmithClient.updateRun(traceId, {
                outputs: { 
                  output: result.content,
                  executionTime,
                },
                end_time: Date.now(),
              });
            } catch (updateError) {
              this.logger.warn(`Failed to update LangSmith trace: ${updateError}`);
            }
          }

          return result.content as string;
        } catch (error) {
          // Log error to LangSmith
          if (this.langsmithEnabled && this.langsmithClient && traceId) {
            try {
              await this.langsmithClient.updateRun(traceId, {
                error: error instanceof Error ? error.message : String(error),
                end_time: Date.now(),
              });
            } catch (updateError) {
              this.logger.warn(`Failed to update LangSmith trace with error: ${updateError}`);
            }
          }
          throw error;
        }
      },
    };
  }

  /**
   * Create a LangGraph workflow for multi-step processes
   */
  createWorkflowChain(workflowDefinition: {
    nodes: Array<{
      id: string;
      name: string;
      handler: (state: any) => Promise<any>;
    }>;
    edges: Array<{
      from: string;
      to: string;
      condition?: (state: any) => boolean;
    }>;
    initialState?: Record<string, any>;
  }) {
    try {
      // Simplified workflow implementation - StateGraph API compatibility issue
      // TODO: Update when LangGraph API is stable
      this.logger.warn('Using simplified workflow implementation - StateGraph API needs update');
      
      return {
        definition: workflowDefinition,
        execute: async (input: Record<string, any>) => {
          try {
            const state: any = { 
              messages: [new HumanMessage(JSON.stringify(input))],
              data: { ...workflowDefinition.initialState, ...input },
              currentStep: '',
            };
            
            // Execute nodes in order based on edges
            const executedNodes = new Set<string>();
            let currentNodeId: string | null | undefined = workflowDefinition.nodes[0]?.id;
            
            while (currentNodeId && !executedNodes.has(currentNodeId)) {
              const node = workflowDefinition.nodes.find(n => n.id === currentNodeId);
              if (!node) break;
              
              this.logger.log(`Executing workflow node: ${node.name} (${node.id})`);
              executedNodes.add(currentNodeId);
              
              const result = await node.handler(state);
              Object.assign(state.data, result);
              state.currentStep = node.id;
              
              // Find next node based on edges
              const nextEdge = workflowDefinition.edges.find(e => e.from === currentNodeId);
              if (nextEdge) {
                if (nextEdge.condition) {
                  currentNodeId = nextEdge.condition(state) ? nextEdge.to : null;
                } else {
                  currentNodeId = nextEdge.to;
                }
              } else {
                currentNodeId = null;
              }
            }
            
            return {
              result: state.data,
              messages: state.messages,
              finalStep: state.currentStep,
            };
          } catch (error) {
            this.logger.error(`Workflow execution failed: ${error}`, error instanceof Error ? error.stack : undefined);
            throw error;
          }
        },
      };
    } catch (error) {
      this.logger.error(`Failed to create workflow chain: ${error}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  /**
   * Create a RAG chain with retrieval
   */
  createRagChain(
    retriever: (query: string) => Promise<Array<{ content: string; metadata?: any }>>,
    options?: {
      systemPrompt?: string;
      temperature?: number;
      runName?: string;
      metadata?: Record<string, any>;
    },
  ) {
    const systemPrompt = options?.systemPrompt || 
      `You are a helpful assistant. Use the following context to answer questions.
If you don't know the answer based on the context, say so.

Context:
{context}

Question: {question}`;

    const prompt = ChatPromptTemplate.fromTemplate(systemPrompt);

    const chain = RunnableSequence.from([
      {
        question: (input: { question: string }) => input.question,
        context: async (input: { question: string }) => {
          const docs = await retriever(input.question);
          return docs.map(doc => doc.content).join('\n\n');
        },
      },
      prompt,
      this.llmAdapter,
    ]);

    return {
      execute: async (question: string) => {
        let traceId: string | undefined;
        const startTime = Date.now();

        try {
          // Start LangSmith trace if enabled
          if (this.langsmithEnabled && this.langsmithClient) {
            try {
              const trace = await this.langsmithClient.createRun({
                name: options?.runName || 'rag_chain',
                run_type: 'chain',
                inputs: { 
                  question,
                  chainType: 'rag',
                  ...options?.metadata,
                },
                project_name: this.langsmithProject,
              });
              traceId = typeof trace === 'string' ? trace : (trace as any).id;
            } catch (traceError) {
              this.logger.warn(`Failed to create LangSmith trace: ${traceError}`);
            }
          }

          const result = await chain.invoke({ question });
          const executionTime = Date.now() - startTime;

          // Update LangSmith trace
          if (this.langsmithEnabled && this.langsmithClient && traceId) {
            try {
              await this.langsmithClient.updateRun(traceId, {
                outputs: { 
                  answer: result.content,
                  executionTime,
                },
                end_time: Date.now(),
              });
            } catch (updateError) {
              this.logger.warn(`Failed to update LangSmith trace: ${updateError}`);
            }
          }

          return result.content as string;
        } catch (error) {
          // Log error to LangSmith
          if (this.langsmithEnabled && this.langsmithClient && traceId) {
            try {
              await this.langsmithClient.updateRun(traceId, {
                error: error instanceof Error ? error.message : String(error),
                end_time: Date.now(),
              });
            } catch (updateError) {
              this.logger.warn(`Failed to update LangSmith trace with error: ${updateError}`);
            }
          }
          throw error;
        }
      },
    };
  }

  /**
   * Check if LangSmith is enabled
   */
  isLangSmithEnabled(): boolean {
    return this.langsmithEnabled;
  }

  /**
   * Get LangSmith client (if enabled)
   */
  getLangSmithClient(): Client | undefined {
    return this.langsmithClient;
  }
}