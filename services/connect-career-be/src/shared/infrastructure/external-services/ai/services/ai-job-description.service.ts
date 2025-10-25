import { Injectable } from '@nestjs/common';
import {
  JobSeniorityLevel,
  JobType,
} from 'src/modules/jobs/domain/entities/job.entity';
import { AIService } from './ai.service';

export interface JobDescriptionPrompt {
  title: string;
  companyName: string;
  location: string;
  jobType: JobType;
  seniorityLevel: JobSeniorityLevel;
  jobFunction?: string;
  industry?: string;
  teamSize?: string;
  reportingTo?: string;
  budget?: string;
  urgency?: 'low' | 'medium' | 'high';
  tone?: 'professional' | 'casual' | 'startup' | 'corporate';
  length?: 'short' | 'medium' | 'detailed';
  companyDescription?: string;
  requirements?: string[];
  responsibilities?: string[];
  benefits?: string[];
  modelId?: string;
  temperature?: number;
}

export interface JobDescriptionResponse {
  variant?: number;
  description: string;
  summary: string;
  keywords: string[];
  requirements: string[];
  responsibilities?: string[];
  benefits?: string[];
  modelId?: string;
  temperature?: number;
}

export interface RefinementPrompt {
  currentDescription: string;
  feedback: string;
  modelId?: string;
  temperature?: number;
}

export interface VariantsPrompt {
  prompt: JobDescriptionPrompt;
  count: number;
  modelId?: string;
  temperature?: number;
}

@Injectable()
export class AIJobDescriptionService {
  constructor(private readonly aiService: AIService) {}
  async generateJobDescription(
    prompt: JobDescriptionPrompt,
  ): Promise<JobDescriptionResponse> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(prompt);

    const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;

    const response = await this.aiService.chat({
      messages: [{ role: 'user', content: combinedPrompt }],
      temperature: prompt.temperature ?? 0.7,
      maxOutputTokens: 2048,
    });

    return this.parseResponse(response.content);
  }

  async refineJobDescription(
    prompt: RefinementPrompt,
  ): Promise<JobDescriptionResponse> {
    const systemPrompt = this.buildRefinementSystemPrompt();
    const userPrompt = this.buildRefinementUserPrompt(
      prompt.currentDescription,
      prompt.feedback,
    );

    const response = await this.aiService.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: prompt.temperature ?? 0.5,
      maxOutputTokens: 2048,
    });

    return this.parseResponse(response.content);
  }

  async generateMultipleVariants(
    prompt: VariantsPrompt,
  ): Promise<JobDescriptionResponse[]> {
    const variants: JobDescriptionResponse[] = [];

    for (let i = 0; i < prompt.count; i++) {
      const variantPrompt = {
        ...prompt.prompt,
        tone: this.getRandomTone(),
        length: this.getRandomLength(),
      };

      const variant = await this.generateJobDescription(variantPrompt);
      variants.push({
        ...variant,
        variant: i + 1,
      });
    }

    return variants;
  }

  async generateText(
    prompt: string,
    options?: {
      temperature?: number;
      maxOutputTokens?: number;
      modelId?: string;
    },
  ): Promise<{ content: string; raw?: any }> {
    return await this.aiService.generate({
      prompt,
      temperature: options?.temperature ?? 0.7,
      maxOutputTokens: options?.maxOutputTokens ?? 1024,
    });
  }

  getAvailableModels() {
    return [
      {
        id: 'gemini-2.0-flash-001',
        name: 'Gemini 2.0 Flash',
        provider: 'Google',
      },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google' },
      { id: 'vertex-ai-gemini', name: 'Vertex AI Gemini', provider: 'Google' },
    ];
  }

  private buildSystemPrompt(): string {
    return `You are an expert HR professional and jobdescription writer with 10+ years of experience.
        Your task is to create compelling, accurate, and inclusive job descriptions that abstract the right candidates. 
        Guidelines: 
        1. Use clear, professional language that's accessiable to all candidates
        2. Focus on essential requirements vs nice-to-haves
        3. Include specific, measurable Responsibilities
        4. Highlight growth opportunities and compnany culture
        5. Use inclusive language and avoid
        6. Structure content logically with clear sections
        7. Include relevant keywords for SEO and ATS systems
        Output format (JSON): 
        { 
          "description": "Full job description with sections: About the Role, Key Responsibilities, Requirements, Benefits, etc.",
          "summary": "2-3 sentence summary for job listings",
            "keywords": ["relevant", "search", "terms"],
            "requirements": ["Must-have requirements"],
            "responsibilities": ["Key job duties"],
            "benefits": ["Company benefits"],
            "suggestedTitle": "Optimized job title",
            "confidence": 0.95
        }`;
  }

  private buildUserPrompt(prompt: JobDescriptionPrompt): string {
    return `Create a job description with these details:
        Job Title: ${prompt.title}
        Company Name: ${prompt.companyName}
        Location: ${prompt.location}
        Type: ${prompt.jobType}
        Seniority: ${prompt.seniorityLevel || 'Not specified'}
        Department: ${prompt.jobFunction || 'Not specified'}
        Industry: ${prompt.industry || 'Not specified'}
        Team Size: ${prompt.teamSize || 'Not specified'}
        Reports to: ${prompt.reportingTo || 'Not specified'}
        Budget: ${prompt.budget || 'Not specified'}
        Urgency: ${prompt.urgency || 'medium'}
        Tone: ${prompt.tone || 'professional'}
        Length: ${prompt.length || 'medium'}

        ${prompt.companyDescription ? `Company Description: ${prompt.companyDescription}` : ''}

        ${prompt.requirements?.length ? `Specific Requirements: ${prompt.requirements.join(', ')}` : ''}
        ${prompt.responsibilities?.length ? `Key Responsibilities: ${prompt.responsibilities.join(', ')}` : ''}
        ${prompt.benefits?.length ? `Benefits to Highlight: ${prompt.benefits.join(', ')}` : ''}

        Please create a comprehensive job description that will attract qualified candidates and clearly communicate the role's value proposition.`;
  }

  private buildRefinementSystemPrompt(): string {
    return `You are an expert job description editor. Your task is to improve an existing job description based on specific feedback.
    
        Guidelines:
        1. Address all feedback points directly
        2. Maintain the original structure unless requested to change
        3. Improve clarity, specificity, and appeal
        4. Ensure inclusive language throughout
        5. Keep the same output format as the original
        
        Output the same JSON format with improved content.`;
  }

  private buildRefinementUserPrompt(
    currentDescription: string,
    feedback: string,
  ): string {
    return `Please improve this job description based on the feedback:
        CURRENT DESCRIPTION: ${currentDescription}

        FEEDBACK: ${feedback}

        Please provide an improved version that addresses the feedback while maintaining professional quality.`;
  }

  private parseResponse(content: string): JobDescriptionResponse {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return this.fallbackParse(content);
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return this.fallbackParse(content);
    }
  }

  private fallbackParse(content: string): JobDescriptionResponse {
    return {
      description: content.trim(),
      summary: '',
      keywords: [],
      requirements: [],
      responsibilities: [],
      benefits: [],
    };
  }

  private getRandomTone(): 'professional' | 'casual' | 'startup' | 'corporate' {
    const tones = ['professional', 'casual', 'startup', 'corporate'];
    return tones[Math.floor(Math.random() * tones.length)] as any;
  }

  private getRandomLength(): 'short' | 'medium' | 'detailed' {
    const lengths = ['short', 'medium', 'detailed'];
    return lengths[Math.floor(Math.random() * lengths.length)] as any;
  }
}
