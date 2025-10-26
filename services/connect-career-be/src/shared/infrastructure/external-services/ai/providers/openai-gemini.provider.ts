import { OpenAI } from "openai";
import { AIChatRequest, AIChatResponse, AIGenerateRequest, AIGenerateResponse, AIProvider } from "../domain/ai-provider.interface";

export class OpenAIGeminiProvider implements AIProvider {
    private openAI: OpenAI;
    constructor(){ 
        this.openAI = new OpenAI({
            apiKey: process.env.GEMINI_API_KEY,
            baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
            maxRetries: 5,
            dangerouslyAllowBrowser: true,        
        });
    }
    async chat(request: AIChatRequest): Promise<AIChatResponse> {
        const completion = await this.openai.chat.completions.create({
          model: "gemini-2.5-flash-lite",
          messages: request.messages,
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxOutputTokens ?? 1024,
        });
    
        return {
          content: completion.choices[0]?.message?.content || '',
          raw: completion,
        };
      }
    
      async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
        const completion = await this.openai.chat.completions.create({
          model: "gemini-2.5-flash-lite",
          messages: [{ role: 'user', content: request.prompt }],
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxOutputTokens ?? 1024,
        });
    
        return {
          content: completion.choices[0]?.message?.content || '',
          raw: completion,
        };
      }
    

}