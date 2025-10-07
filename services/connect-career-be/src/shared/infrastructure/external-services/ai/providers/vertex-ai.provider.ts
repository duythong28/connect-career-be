import { VertexAI } from '@google-cloud/vertexai';
import {
  AIChatRequest,
  AIChatResponse,
  AIGenerateRequest,
  AIGenerateResponse,
  AIProvider,
} from '../domain/ai-provider.interface';

export class VertexAIProvider implements AIProvider {
  private vertexAI: VertexAI;
  private textModelId: string;
  private embeddingModelId: string;
  private location: string;
  private projectId: string;
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
  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    const generativeModel = this.vertexAI.getGenerativeModel({
      model: this.textModelId,
    });
    const contents = request.messages.map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    }));
    const response = await generativeModel.generateContent({
      contents,
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        topP: request.topP ?? 0.95,
        topK: request.topK ?? 40,
        maxOutputTokens: request.maxOutputTokens ?? 1024,
      },
    });
    const text =
      response.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { content: text, raw: response };
  }
  async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    const generativeModel = this.vertexAI.getGenerativeModel({
      model: this.textModelId,
    });

    const response = await generativeModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        topP: request.topP ?? 0.95,
        topK: request.topK ?? 40,
        maxOutputTokens: request.maxOutputTokens ?? 1024,
      },
    });
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

    const resp = await generativeModel.generateContent({
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
    });

    const text =
      resp?.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { content: text, raw: resp };
  }
}
