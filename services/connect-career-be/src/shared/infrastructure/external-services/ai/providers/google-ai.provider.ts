import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { Injectable } from '@nestjs/common';
import {
  AIChatRequest,
  AIGenerateRequest,
  AIProvider,
  AIVectorizeRequest,
  AIVectorizeResponse,
} from '../domain/ai-provider.interface';

@Injectable()
export class GoogleAIProvider implements AIProvider {
  private genAI: GoogleGenerativeAI;
  private files: GoogleAIFileManager;
  private textModelId: string;

  constructor(options?: { apiKey?: string; textModelId?: string }) {
    const apiKey = options?.apiKey || process.env.GOOGLE_AI_API_KEY!;
    this.textModelId = options?.textModelId || 'gemini-1.5-pro';
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.files = new GoogleAIFileManager(apiKey);
  }

  async chat(req: AIChatRequest) {
    const model = this.genAI.getGenerativeModel({
      model: this.textModelId,
      generationConfig: {
        temperature: req.temperature ?? 0.7,
        maxOutputTokens: req.maxOutputTokens ?? 1024,
      },
    });

    const contents = req.messages.map((m) => ({
      role: m.role === 'system' ? 'user' : m.role,
      parts: [{ text: m.content }],
    }));

    const resp = await model.generateContent({ contents });
    const text =
      resp.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { content: text, raw: resp };
  }

  async generate(req: AIGenerateRequest) {
    const model = this.genAI.getGenerativeModel({
      model: this.textModelId,
      generationConfig: {
        temperature: req.temperature ?? 0.7,
        maxOutputTokens: req.maxOutputTokens ?? 1024,
      },
    });
    const resp = await model.generateContent(req.prompt);
    const text =
      resp.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { content: text, raw: resp };
  }

  async embed(req: AIVectorizeRequest): Promise<AIVectorizeResponse> {
    try {
      // Use Google Generative AI embedding model
      const model = this.genAI.getGenerativeModel({
        model: 'text-embedding-004', // Google's embedding model
      });

      // Check if the model has an embedContent method
      if (typeof (model as any).embedContent === 'function') {
        const response = await (model as any).embedContent({
          content: { parts: [{ text: req.text }] },
        });

        // Extract embedding from response
        const embedding: number[] =
          (response as any)?.embedding?.values ||
          (response as any)?.embedding?.embedding ||
          (response as any)?.embedding ||
          [];

        if (!Array.isArray(embedding) || embedding.length === 0) {
          throw new Error('Empty embedding returned from Google AI');
        }

        // Normalize the embedding vector
        const norm = Math.sqrt(
          embedding.reduce((sum: number, val: number) => sum + val * val, 0),
        );
        const normalizedEmbedding: number[] =
          norm > 0 ? embedding.map((val: number) => val / norm) : embedding;

        return {
          vector: normalizedEmbedding,
          raw: response,
        };
      }

      // Fallback: If embedContent is not available, throw an error
      throw new Error(
        'Embedding not supported by this Google AI model. Use text-embedding-004 or ensure the model supports embeddings.',
      );
    } catch (error) {
      throw new Error(
        `Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async uploadFile(data: Buffer, mimeType: string, displayName: string) {
    const upload = await this.files.uploadFile(data, {
      mimeType,
      displayName,
    });
    return upload?.file?.uri as string;
  }

  async generateWithFileUri(req: {
    prompt: string;
    fileUri: string;
    mimeType: string;
    temperature?: number;
  }) {
    const model = this.genAI.getGenerativeModel({
      model: this.textModelId,
      generationConfig: {
        temperature: req.temperature ?? 0,
        responseMimeType: 'text/plain',
      },
    });
    const resp = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: req.prompt },
            { fileData: { fileUri: req.fileUri, mimeType: req.mimeType } },
          ],
        },
      ],
    });
    const text =
      resp.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { content: text, raw: resp };
  }

  async generateWithInlineFile(req: {
    prompt: string;
    base64: string;
    mimeType: string;
    temperature?: number;
  }) {
    const model = this.genAI.getGenerativeModel({
      model: this.textModelId,
      generationConfig: {
        temperature: req.temperature ?? 0,
        responseMimeType: 'text/plain',
      },
    });
    const resp = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: req.prompt },
            { inlineData: { data: req.base64, mimeType: req.mimeType } },
          ],
        },
      ],
    });
    const text =
      resp.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { content: text, raw: resp };
  }
}
