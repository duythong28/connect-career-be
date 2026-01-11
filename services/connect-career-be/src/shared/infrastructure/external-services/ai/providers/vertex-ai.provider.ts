import { VertexAI } from '@google-cloud/vertexai';
import {
  AIChatRequest,
  AIChatResponse,
  AIGenerateRequest,
  AIGenerateResponse,
  AIVectorizeRequest,
  AIVectorizeResponse,
  AIProvider,
} from '../domain/ai-provider.interface';

export class VertexAIProvider implements AIProvider {
  private vertexAI: VertexAI;
  private textModelId: string;
  private embeddingModelId: string;
  private location: string;
  private projectId: string;
  private readonly maxRetries: number = 5;
  private readonly initialRetryDelay: number = 2000;
  private readonly maxRetryDelay: number = 32000;

  constructor(options?: {
    projectId?: string;
    location?: string;
    textModelId?: string;
    embeddingModelId: string;
  }) {
    this.projectId = options?.projectId || process.env.GOOGLE_PROJECT_ID || '';
    this.location =
      options?.location || process.env.GOOGLE_LOCATION || 'us-central1';
    this.textModelId =
      options?.textModelId ||
      process.env.GOOGLE_TEXT_MODEL_ID ||
      'gemini-2.0-flash-001';
    this.embeddingModelId =
      options?.embeddingModelId ||
      process.env.GOOGLE_EMBEDDING_MODEL_ID ||
      'gemini-embedding-001';
    this.vertexAI = new VertexAI({
      project: this.projectId,
      location: this.location,
    });
  }

  /**
   * Check if an error is a rate limit error (429)
   */
  private isRateLimitError(error: any): boolean {
    if (!error) return false;

    // Check error message
    const errorMessage = error.message || String(error);
    if (
      errorMessage.includes('429') ||
      errorMessage.includes('Too Many Requests')
    ) {
      return true;
    }

    // Check error code
    if (error.code === 429) {
      return true;
    }

    // Check nested error structure (GoogleApiError)
    if (error.cause) {
      const cause = error.cause;
      if (cause.code === 429 || cause.status === 'RESOURCE_EXHAUSTED') {
        return true;
      }
    }

    // Check stackTrace property
    if (error.stackTrace) {
      const stackTrace = error.stackTrace;
      if (
        stackTrace.code === 429 ||
        stackTrace.status === 'RESOURCE_EXHAUSTED'
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Retry wrapper with exponential backoff for rate limit errors
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    operationName: string = 'operation',
  ): Promise<T> {
    let lastError: any;
    let delay = this.initialRetryDelay;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Only retry on rate limit errors
        if (!this.isRateLimitError(error)) {
          throw error;
        }

        // If this was the last attempt, throw the error
        if (attempt === this.maxRetries) {
          throw error;
        }

        // Add jitter to avoid thundering herd problem
        const jitter = Math.random() * 0.3 * delay; // 0-30% jitter
        const delayWithJitter = Math.min(delay + jitter, this.maxRetryDelay);

        // Log retry attempt
        console.warn(
          `[VertexAIProvider] Rate limit error on ${operationName} (attempt ${attempt + 1}/${this.maxRetries + 1}). Retrying in ${Math.round(delayWithJitter)}ms...`,
        );

        // Wait before retrying with exponential backoff + jitter
        await new Promise((resolve) => setTimeout(resolve, delayWithJitter));
        delay = Math.min(delay * 2, this.maxRetryDelay); // Exponential backoff with max cap
      }
    }

    throw lastError;
  }
  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    const generativeModel = this.vertexAI.getGenerativeModel({
      model: this.textModelId,
    });

    const contents: Array<{
      role: 'user' | 'model';
      parts: Array<{ text: string }>;
    }> = [];
    const systemMessages: string[] = [];

    for (const message of request.messages) {
      if (message.role === 'system') {
        systemMessages.push(message.content);
      } else if (message.role === 'user') {
        let userContent = message.content;
        if (systemMessages.length > 0 && contents.length === 0) {
          userContent = systemMessages.join('\n\n') + '\n\n' + userContent;
          systemMessages.length = 0; // Clear after using
        }
        contents.push({
          role: 'user',
          parts: [{ text: userContent }],
        });
      } else if (message.role === 'assistant') {
        // VertexAI uses 'model' role for assistant responses
        contents.push({
          role: 'model',
          parts: [{ text: message.content }],
        });
      }
    }

    // If only system messages exist, convert to user message
    if (systemMessages.length > 0 && contents.length === 0) {
      contents.push({
        role: 'user',
        parts: [{ text: systemMessages.join('\n\n') }],
      });
    }

    const response = await this.retryWithBackoff(
      () =>
        generativeModel.generateContent({
          contents,
          generationConfig: {
            temperature: request.temperature ?? 0.7,
            topP: request.topP ?? 0.95,
            topK: request.topK ?? 40,
            maxOutputTokens: request.maxOutputTokens ?? 1024,
          },
        }),
      'chat',
    );

    const text =
      response.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { content: text, raw: response };
  }

  async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    const generativeModel = this.vertexAI.getGenerativeModel({
      model: this.textModelId,
    });

    const response = await this.retryWithBackoff(
      () =>
        generativeModel.generateContent({
          contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
          generationConfig: {
            temperature: request.temperature ?? 0.7,
            topP: request.topP ?? 0.95,
            topK: request.topK ?? 40,
            maxOutputTokens: request.maxOutputTokens ?? 1024,
          },
        }),
      'generate',
    );

    const text =
      response.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { content: text, raw: response };
  }

  async generateWithInlineFile(req: {
    prompt: string;
    inline: { dataBase64: string; mimeType: string };
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
  }): Promise<{ content: string; raw?: any }> {
    const generativeModel = this.vertexAI.getGenerativeModel({
      model: this.textModelId,
    });

    const resp = await this.retryWithBackoff(
      () =>
        generativeModel.generateContent({
          generationConfig: {
            temperature: req.temperature ?? 0,
            topP: req.topP ?? 0.95,
            topK: req.topK ?? 40,
            maxOutputTokens: req.maxOutputTokens ?? 4096,
            responseMimeType: 'text/plain',
          },
          contents: [
            {
              role: 'user',
              parts: [
                { text: req.prompt },
                {
                  inlineData: {
                    data: req.inline.dataBase64,
                    mimeType: req.inline.mimeType,
                  },
                },
              ],
            },
          ],
        }),
      'generateWithInlineFile',
    );

    const text =
      resp?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { content: text, raw: resp };
  }

  async *chatStream(
    request: AIChatRequest,
  ): AsyncGenerator<string, void, unknown> {
    const generativeModel = this.vertexAI.getGenerativeModel({
      model: this.textModelId,
    });

    const contents: Array<{
      role: 'user' | 'model';
      parts: Array<{ text: string }>;
    }> = [];
    const systemMessages: string[] = [];

    for (const message of request.messages) {
      if (message.role === 'system') {
        systemMessages.push(message.content);
      } else if (message.role === 'user') {
        let userContent = message.content;
        if (systemMessages.length > 0 && contents.length === 0) {
          userContent = systemMessages.join('\n\n') + '\n\n' + userContent;
          systemMessages.length = 0;
        }
        contents.push({
          role: 'user',
          parts: [{ text: userContent }],
        });
      } else if (message.role === 'assistant') {
        contents.push({
          role: 'model',
          parts: [{ text: message.content }],
        });
      }
    }

    if (systemMessages.length > 0 && contents.length === 0) {
      contents.push({
        role: 'user',
        parts: [{ text: systemMessages.join('\n\n') }],
      });
    }

    // For streaming, we need to handle retries differently
    // since we can't retry a stream that's already started
    let streamingResp;
    try {
      streamingResp = await generativeModel.generateContentStream({
        contents,
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          topP: request.topP ?? 0.95,
          topK: request.topK ?? 40,
          maxOutputTokens: request.maxOutputTokens ?? 1024,
        },
      });
    } catch (error) {
      // If it's a rate limit error, retry the initial stream creation
      if (this.isRateLimitError(error)) {
        streamingResp = await this.retryWithBackoff(
          () =>
            generativeModel.generateContentStream({
              contents,
              generationConfig: {
                temperature: request.temperature ?? 0.7,
                topP: request.topP ?? 0.95,
                topK: request.topK ?? 40,
                maxOutputTokens: request.maxOutputTokens ?? 1024,
              },
            }),
          'chatStream',
        );
      } else {
        throw error;
      }
    }

    for await (const chunk of streamingResp.stream) {
      const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (text) {
        yield text;
      }
    }
  }

  async embed(request: AIVectorizeRequest): Promise<AIVectorizeResponse> {
    try {
      // Use Google Generative AI REST API directly (simpler and more reliable)
      const apiKey = process.env.GOOGLE_AI_API_KEY;

      if (apiKey) {
        // Use API key as query parameter (correct authentication method for Generative AI API)
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content: { parts: [{ text: request.text }] },
            }),
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Google Generative AI API error: ${response.status} ${errorText}`,
          );
        }

        const data = await response.json();
        const embedding = data.embedding?.values || [];

        if (!Array.isArray(embedding) || embedding.length === 0) {
          throw new Error('Empty embedding returned from Google Generative AI');
        }

        // Normalize the embedding vector
        const norm = Math.sqrt(
          embedding.reduce((sum: number, val: number) => sum + val * val, 0),
        );
        const normalizedEmbedding: number[] =
          norm > 0 ? embedding.map((val: number) => val / norm) : embedding;

        return {
          vector: normalizedEmbedding,
          raw: data,
        };
      }

      // Fallback to Vertex AI if no API key
      throw new Error('GOOGLE_AI_API_KEY not configured');
    } catch (error) {
      throw new Error(
        `Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
