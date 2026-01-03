export interface AIChatRequest {
  messages: Array<{ role: 'user' | 'system' | 'assistant'; content: string }>;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
}

export interface AIChatResponse {
  content: string;
  raw?: any;
}

export interface AIEmbeddingResponse {
  vector: number[];
  raw?: any;
}

export interface AIGenerateRequest {
  prompt: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
}

export interface AIGenerateResponse {
  content: string;
  raw?: any;
}

export interface AIVectorizeRequest {
  text: string;
}

export interface AIVectorizeResponse {
  vector: number[];
  raw?: any;
}

export interface AIProvider {
  chat(request: AIChatRequest): Promise<AIChatResponse>;
  generate(request: AIGenerateRequest): Promise<AIGenerateResponse>;
  chatStream?(request: AIChatRequest): AsyncGenerator<string, void, unknown>;
  embed?(request: AIVectorizeRequest): Promise<AIVectorizeResponse>;
}
