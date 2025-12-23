import { Injectable, Logger, Optional, OnModuleDestroy } from '@nestjs/common';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';
import { IAgent } from '../../domain/interfaces/agent.interface';
import { ITool } from '../../domain/interfaces/tool.interface';
import { AgentContext } from '../../domain/types/agent.types';
import { ConfigService } from '@nestjs/config';
import { createAgent } from "langchain";  

import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import {
  DynamicStructuredTool,
  StructuredToolInterface,
} from '@langchain/core/tools';
import { z } from 'zod';
import { Runnable, RunnableSequence } from '@langchain/core/runnables';
import {
  BaseMessage,
  HumanMessage,
  AIMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatGeneration, ChatResult } from '@langchain/core/outputs';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';

// LangSmith imports
import { Client } from 'langsmith';

// Constants
const MAX_CHAT_HISTORY_LENGTH = 20;
const DEFAULT_MAX_ITERATIONS = 15;
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_OUTPUT_TOKENS = 4096;

// Custom LLM adapter that properly extends BaseChatModel
class CustomLLMAdapter extends BaseChatModel {
  private aiService: AIService;
  private readonly logger = new Logger(CustomLLMAdapter.name);

  constructor(aiService: AIService) {
    super({});
    this.aiService = aiService;
  }

  _llmType(): string {
    return 'custom';
  }

  _identifyParams(): Record<string, any> {
    return {
      model_name: 'custom',
    };
  }

  async _generate(
    messages: BaseMessage[],
    options?: this['ParsedCallOptions'],
  ): Promise<ChatResult> {
    try {
      const formattedMessages: Array<{
        role: 'user' | 'assistant' | 'system';
        content: string;
      }> = messages.map((msg) => ({
        role:
          msg instanceof HumanMessage
            ? ('user' as const)
            : msg instanceof AIMessage
              ? ('assistant' as const)
              : msg instanceof SystemMessage
                ? ('system' as const)
                : ('user' as const),
        content:
          typeof msg.content === 'string'
            ? msg.content
            : JSON.stringify(msg.content),
      }));

      const response = await this.aiService.chat({
        messages: formattedMessages,
        temperature:
          (options as unknown as { temperature?: number })?.temperature ||
          DEFAULT_TEMPERATURE,
        maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
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
    } catch (error) {
      this.logger.error(
        `LLM generation failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  // Mark streaming as unsupported
  _streamResponseChunks(
    _messages: BaseMessage[],
    _options?: this['ParsedCallOptions'],
    _runManager?: CallbackManagerForLLMRun,
  ): AsyncGenerator<any> {
    throw new Error('Streaming is not supported by this LLM adapter');
  }

  bindTools(): Runnable<any, any> {
    // Return a new instance with tools bound
    return new CustomLLMAdapter(this.aiService) as any;
  }

  // Metadata to indicate streaming is not supported
  get supportsStreaming(): boolean {
    return false;
  }
}

// Type for LangSmith Run response
interface LangSmithRun {
  id?: string;
  [key: string]: any;
}

@Injectable()
export class ChainsService implements OnModuleDestroy {
  private readonly logger = new Logger(ChainsService.name);
  private readonly llmAdapter: CustomLLMAdapter;
  private readonly langsmithClient?: Client;
  private readonly langsmithEnabled: boolean;
  private readonly langsmithProject: string;
  private readonly promptCache: Map<string, ChatPromptTemplate> = new Map();

  constructor(
    private readonly aiService: AIService,
    @Optional() private readonly configService?: ConfigService,
  ) {
    this.llmAdapter = new CustomLLMAdapter(aiService);

    // Initialize LangSmith if API key is provided
    const langsmithApiKey =
      this.configService?.get<string>('LANGSMITH_API_KEY');
    this.langsmithProject =
      this.configService?.get<string>('LANGSMITH_PROJECT') ||
      'connect-career-ai-agent';

    if (langsmithApiKey) {
      try {
        this.langsmithClient = new Client({
          apiKey: langsmithApiKey,
        });

        this.langsmithEnabled = true;
        this.logger.log(
          `LangSmith monitoring enabled for project: ${this.langsmithProject}`,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to initialize LangSmith: ${error instanceof Error ? error.message : String(error)}`,
        );
        this.langsmithEnabled = false;
      }
    } else {
      this.langsmithEnabled = false;
      this.logger.debug('LangSmith API key not found - monitoring disabled');
    }
  }

  /**
   * Cleanup resources on module destroy
   */
  async onModuleDestroy() {
    this.logger.log('Cleaning up ChainsService resources');
    this.promptCache.clear();
  }

  /**
   * Truncate chat history to prevent memory issues
   */
  private truncateChatHistory(
    history: BaseMessage[],
    maxLength: number = MAX_CHAT_HISTORY_LENGTH,
  ): BaseMessage[] {
    if (history.length <= maxLength) {
      return history;
    }

    this.logger.debug(
      `Truncating chat history from ${history.length} to ${maxLength} messages`,
    );
    return history.slice(-maxLength);
  }

  /**
   * Convert ITool to LangChain DynamicStructuredTool with validation
   */
    /**
   * Convert ITool to LangChain DynamicStructuredTool with validation
   */
    private convertToolToLangChain(tool: ITool): DynamicStructuredTool {
      const schemaObject: Record<string, z.ZodTypeAny> = {};
  
      for (const param of tool.parameters) {
        let zodType: z.ZodTypeAny;
  
        switch (param.type) {
          case 'string':
            zodType = z.string().describe(param.description || '');
            break;
          case 'number':
            zodType = z.number().describe(param.description || '');
            break;
          case 'boolean':
            zodType = z.boolean().describe(param.description || '');
            break;
          case 'array':
            zodType = z.array(z.any()).describe(param.description || '');
            break;
          case 'object':
            zodType = z
              .record(z.string(), z.any())
              .describe(param.description || '');
            break;
          default:
            zodType = z.any().describe(param.description || '');
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
            // Validate parameters before execution
            const validated = zodSchema.parse(params);
  
            this.logger.debug(
              `Executing tool: ${tool.name} with params: ${JSON.stringify(validated)}`,
            );
  
            const result: any = await tool.execute(validated);
            
            // Format tool response for LLM readability
            return this.formatToolResponse(result, tool.name);
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            this.logger.error(
              `Tool ${tool.name} execution failed: ${errorMessage}`,
              error instanceof Error ? error.stack : undefined,
            );
            throw new Error(`Tool execution failed: ${errorMessage}`);
          }
        },
      });
    }
  
      /**
   * Format tool response for optimal LLM parsing
   * Returns a readable string format that LLMs can easily understand
   */
  private formatToolResponse(result: any, toolName: string): string {
    // If already a string, return as-is
    if (typeof result === 'string') {
      return result;
    }

    // Handle null/undefined
    if (result === null || result === undefined) {
      return `Tool ${toolName} returned no result.`;
    }

    // Handle errors
    if (result instanceof Error) {
      return `Error from ${toolName}: ${result.message}`;
    }

    // Handle empty results
    if (Array.isArray(result) && result.length === 0) {
      return `No results found from ${toolName}.`;
    }

    if (typeof result === 'object') {
      // Check if it's an empty object
      if (Object.keys(result).length === 0) {
        return `No data returned from ${toolName}.`;
      }

      // Special formatting for job search results
      if (toolName === 'search_jobs' || toolName === 'filter_jobs') {
        return this.formatJobSearchResponse(result, toolName);
      }

      // Format as readable JSON with indentation for LLM parsing
      try {
        const formatted = JSON.stringify(result, null, 2);
        
        // Add a summary header for better context
        const summary = this.generateResultSummary(result, toolName);
        return `${summary}\n\nResult:\n${formatted}`;
      } catch (jsonError) {
        // Fallback if JSON.stringify fails
        return `Result from ${toolName}: ${String(result)}`;
      }
    }

    // For primitives, convert to string
    return String(result);
  }

  /**
   * Format job search results in a natural language format
   */
  private formatJobSearchResponse(result: any, toolName: string): string {
    if (!result.success) {
      return `Job search failed: ${result.error || 'Unknown error'}`;
    }

    const jobs = result.jobs || [];
    const total = result.total || 0;

    if (jobs.length === 0) {
      return `No jobs found matching your criteria. Total jobs searched: ${total}.`;
    }

    let response = `Found ${total} job(s) matching your search criteria. Here are ${jobs.length} result(s):\n\n`;

    jobs.forEach((job: any, index: number) => {
      response += `${index + 1}. **${job.title}** at ${job.company}\n`;
      response += `   - Location: ${job.location}${job.country ? `, ${job.country}` : ''}\n`;
      response += `   - Type: ${job.type || 'Not specified'}\n`;
      if (job.seniorityLevel) {
        response += `   - Level: ${job.seniorityLevel}\n`;
      }
      if (job.salaryRange) {
        const { min, max, currency } = job.salaryRange;
        response += `   - Salary: ${min}${max ? ` - ${max}` : ''} ${currency || 'USD'}\n`;
      }
      if (job.summary) {
        response += `   - Summary: ${job.summary.substring(0, 150)}${job.summary.length > 150 ? '...' : ''}\n`;
      }
      if (job.skills && job.skills.length > 0) {
        response += `   - Skills: ${job.skills.slice(0, 5).join(', ')}${job.skills.length > 5 ? '...' : ''}\n`;
      }
      response += `   - Job ID: ${job.id}\n\n`;
    });

    if (result.totalPages && result.totalPages > 1) {
      response += `\nNote: Showing page ${result.page} of ${result.totalPages}. Use pageNumber parameter to see more results.`;
    }

    return response;
  }
  
    /**
     * Generate a human-readable summary of tool results
     */
    private generateResultSummary(result: any, toolName: string): string {
      if (Array.isArray(result)) {
        return `Found ${result.length} item(s) from ${toolName}.`;
      }
  
      if (typeof result === 'object' && result !== null) {
        const keys = Object.keys(result);
        if (keys.length > 0) {
          // Check for common result patterns
          if ('jobs' in result && Array.isArray(result.jobs)) {
            return `Found ${result.jobs.length} job(s) from ${toolName}.`;
          }
          if ('resources' in result && Array.isArray(result.resources)) {
            return `Found ${result.resources.length} resource(s) from ${toolName}.`;
          }
          if ('skills' in result && Array.isArray(result.skills)) {
            return `Extracted ${result.skills.length} skill(s) from ${toolName}.`;
          }
          if ('total' in result) {
            return `Total: ${result.total} result(s) from ${toolName}.`;
          }
          return `Retrieved ${keys.length} field(s) from ${toolName}.`;
        }
      }
  
      return `Result from ${toolName}:`;
    }

  /**
   * Create LangSmith trace
   */
  private async createLangSmithTrace(
    name: string,
    inputs: Record<string, any>,
  ): Promise<string | undefined> {
    if (!this.langsmithEnabled || !this.langsmithClient) {
      return undefined;
    }

    try {
      const run = await this.langsmithClient.createRun({
        name,
        run_type: 'chain',
        inputs,
        project_name: this.langsmithProject,
      });

      // Safely extract trace ID
      const traceId = (run as unknown as LangSmithRun)?.id;

      if (traceId) {
        this.logger.debug(`Created LangSmith trace: ${traceId}`);
      }

      return traceId;
    } catch (error) {
      this.logger.warn(
        `Failed to create LangSmith trace: ${error instanceof Error ? error.message : String(error)}`,
      );
      return undefined;
    }
  }

  /**
   * Update LangSmith trace
   */
  private async updateLangSmithTrace(
    traceId: string,
    data: {
      outputs?: Record<string, any>;
      error?: string;
      end_time?: number;
    },
  ): Promise<void> {
    if (!this.langsmithEnabled || !this.langsmithClient) {
      return;
    }

    try {
      await this.langsmithClient.updateRun(traceId, data);
      this.logger.debug(`Updated LangSmith trace: ${traceId}`);
    } catch (error) {
      this.logger.warn(
        `Failed to update LangSmith trace: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Create an agent chain with tools using modern LangGraph (v0.2+)
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
      const langChainTools = tools.map((tool) =>
        this.convertToolToLangChain(tool),
      );

      this.logger.log(
        `Creating agent chain for ${agent.name} with ${langChainTools.length} tools using LangGraph`,
      );

      // Create system prompt
      const systemPrompt = `You are ${agent.name}: ${agent.description}

Your capabilities: ${agent.capabilities.join(', ')}

You have access to the following tools. Use them when needed to complete tasks.
Always explain what you're doing and why.`;

      // Create prompt template (cache it)
      const cacheKey = `agent_${agent.name}`;
      let prompt = this.promptCache.get(cacheKey);

      if (!prompt) {
        prompt = ChatPromptTemplate.fromMessages([
          ['system', systemPrompt],
          new MessagesPlaceholder('chat_history'),
          ['human', '{input}'],
          new MessagesPlaceholder('agent_scratchpad'),
        ]);
        this.promptCache.set(cacheKey, prompt);
      }

      // Create agent using modern LangGraph ReactAgent
      // createReactAgent returns a compiled graph that can be invoked directly
      const agentGraph = createAgent({
        model: this.llmAdapter,
        tools: langChainTools,
        systemPrompt: systemPrompt, // Use the ChatPromptTemplate you created above
      });


      return {
        agent,
        tools: langChainTools,
        executor: agentGraph,
        execute: async (input: string, context?: AgentContext) => {
          const startTime = Date.now();
          let traceId: string | undefined;

          try {
            // Truncate chat history to prevent memory issues
            const chatHistory = this.truncateChatHistory(
              options?.chatHistory || [],
            );

            // Start LangSmith trace
            traceId = await this.createLangSmithTrace(
              options?.runName || `${agent.name}_execution`,
              {
                input,
                agentName: agent.name,
                context: context ? JSON.stringify(context) : undefined,
                toolCount: tools.length,
                historyLength: chatHistory.length,
                ...options?.metadata,
              },
            );

            this.logger.log(
              `Executing agent ${agent.name} with input length: ${input.length}`,
            );

            // Prepare input for LangGraph
            // createReactAgent expects messages array in the state
            const graphInput = {
              messages: [...chatHistory, new HumanMessage(input)],
            };

            const maxIterations =
              options?.maxIterations || DEFAULT_MAX_ITERATIONS;

            const config = {
              recursionLimit: maxIterations,
            };

            const result = await agentGraph.invoke(graphInput, config);

            const executionTime = Date.now() - startTime;

            // Extract the final message
            // createReactAgent returns state with messages array
            const finalMessages = result.messages || [];
            const lastMessage = finalMessages[finalMessages.length - 1];
            const output = lastMessage?.content || 'No response generated';

            this.logger.log(
              `Agent ${agent.name} execution completed in ${executionTime}ms`,
            );

            // Update LangSmith trace with results
            if (traceId) {
              await this.updateLangSmithTrace(traceId, {
                outputs: {
                  output,
                  messageCount: finalMessages.length,
                  executionTime,
                  success: true,
                },
                end_time: Date.now(),
              });
            }

            return {
              output,
              messages: finalMessages,
              traceId,
              executionTime,
            };
          } catch (error) {
            const executionTime = Date.now() - startTime;
            const errorMessage =
              error instanceof Error ? error.message : String(error);

            this.logger.error(
              `Agent ${agent.name} execution failed after ${executionTime}ms: ${errorMessage}`,
              error instanceof Error ? error.stack : undefined,
            );

            // Log error to LangSmith
            if (traceId) {
              await this.updateLangSmithTrace(traceId, {
                error: errorMessage,
                end_time: Date.now(),
                outputs: {
                  executionTime,
                  success: false,
                },
              });
            }

            throw error;
          }
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to create agent chain: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
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
    // Cache prompt template
    const cacheKey = `simple_${systemPrompt.substring(0, 50)}`;
    let prompt = this.promptCache.get(cacheKey);

    if (!prompt) {
      prompt = ChatPromptTemplate.fromMessages([
        ['system', systemPrompt],
        ['human', '{input}'],
      ]);
      this.promptCache.set(cacheKey, prompt);
    }

    const chain = RunnableSequence.from([prompt, this.llmAdapter]);

    return {
      execute: async (input: string) => {
        const startTime = Date.now();
        let traceId: string | undefined;

        try {
          // Start LangSmith trace
          traceId = await this.createLangSmithTrace(
            options?.runName || 'simple_chain',
            {
              input,
              ...options?.metadata,
            },
          );

          this.logger.debug(
            `Executing simple chain with input length: ${input.length}`,
          );

          const result = await chain.invoke({ input });
          const executionTime = Date.now() - startTime;

          this.logger.debug(`Simple chain completed in ${executionTime}ms`);

          // Update LangSmith trace
          if (traceId) {
            await this.updateLangSmithTrace(traceId, {
              outputs: {
                output: result.content,
                executionTime,
              },
              end_time: Date.now(),
            });
          }

          return result.content as string;
        } catch (error) {
          const executionTime = Date.now() - startTime;
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          this.logger.error(
            `Simple chain execution failed after ${executionTime}ms: ${errorMessage}`,
            error instanceof Error ? error.stack : undefined,
          );

          // Log error to LangSmith
          if (traceId) {
            await this.updateLangSmithTrace(traceId, {
              error: errorMessage,
              end_time: Date.now(),
            });
          }

          throw error;
        }
      },
    };
  }

  /**
   * Create a RAG chain with retrieval
   */
  createRagChain(
    retriever: (
      query: string,
    ) => Promise<Array<{ content: string; metadata?: any }>>,
    options?: {
      systemPrompt?: string;
      temperature?: number;
      runName?: string;
      metadata?: Record<string, any>;
    },
  ) {
    const systemPrompt =
      options?.systemPrompt ||
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
          return docs.map((doc) => doc.content).join('\n\n');
        },
      },
      prompt,
      this.llmAdapter,
    ]);

    return {
      execute: async (question: string) => {
        const startTime = Date.now();
        let traceId: string | undefined;

        try {
          // Start LangSmith trace
          traceId = await this.createLangSmithTrace(
            options?.runName || 'rag_chain',
            {
              question,
              chainType: 'rag',
              ...options?.metadata,
            },
          );

          this.logger.debug(
            `Executing RAG chain with question: ${question.substring(0, 100)}`,
          );

          const result = await chain.invoke({ question });
          const executionTime = Date.now() - startTime;

          this.logger.debug(`RAG chain completed in ${executionTime}ms`);

          // Update LangSmith trace
          if (traceId) {
            await this.updateLangSmithTrace(traceId, {
              outputs: {
                answer: result.content,
                executionTime,
              },
              end_time: Date.now(),
            });
          }

          return result.content as string;
        } catch (error) {
          const executionTime = Date.now() - startTime;
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          this.logger.error(
            `RAG chain execution failed after ${executionTime}ms: ${errorMessage}`,
            error instanceof Error ? error.stack : undefined,
          );

          // Log error to LangSmith
          if (traceId) {
            await this.updateLangSmithTrace(traceId, {
              error: errorMessage,
              end_time: Date.now(),
            });
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

  /**
   * Check if agent functionality is available (always true with LangGraph)
   */
  isAgentFunctionalityAvailable(): boolean {
    return true; // LangGraph is always available if imported
  }

  /**
   * Clear prompt cache
   */
  clearPromptCache(): void {
    this.logger.debug('Clearing prompt cache');
    this.promptCache.clear();
  }
}
