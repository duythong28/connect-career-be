import { Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(AIJobDescriptionService.name);
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


    return await this.parseResponse(response.content);
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
        id: 'gemini-2.5-flash-lite',
        name: 'Gemini 2.5 Flash Lite',
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
          "description": "Full job description with sections: About the Role, Key Responsibilities, Requirements, Benefits, etc. Use direct markdown format.",
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

  private async parseResponse(content: string): Promise<JobDescriptionResponse> {
    try {
      let jsonString: string | null = null;
      const codeBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch && codeBlockMatch[1]) {
        jsonString = codeBlockMatch[1];
      } else {
        const greedyMatch = content.match(/\{[\s\S]*\}/);
        if (greedyMatch) {
          jsonString = greedyMatch[0];
        }
      }
  
      if (jsonString) {
        const parsed = JSON.parse(jsonString);
        
        if (parsed.description && typeof parsed.description === 'string') {
          console.log('parsed.description', parsed.description);
        }
        
        return parsed;
      }
  
      return this.fallbackParse(content);
      
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return this.fallbackParse(content);
    }
  }  
  private async reformatJobDescription(description: string): Promise<string> {
    try {
      const reformatPrompt = `You will be given a job description in a string format that uses \`## Heading\` (H2 style) and \`\\n\` for newlines. Your task is to reformat this text into a new Markdown structure.
            
            **Reformatting Rules:**
            
            1. **Heading Conversion:** Convert all \`## Heading\` style headings to \`**Heading:**\` (bolded text with a colon).
              * \`## About the Role\` becomes \`**About the Role:**\`
              * \`## Key Responsibilities\` becomes \`**Key Responsibilities:**\`
              * ...and so on for all sections.
            
            2. **Section Reordering:** Ensure the final output follows this **exact** section order:
              1. \`**About the Role:**\`
              2. \`**Key Responsibilities:**\`
              3. \`**Requirements:**\`
              4. \`**Benefits:**\`
              5. \`**Company Culture:**\`
              6. \`**Growth Opportunities:**\`
              *(Note: You will need to move the \`Company Culture\` section to be before the \`Growth Opportunities\` section.)*
            
            3. **Content and Spacing:**
              * Keep the original paragraphs and bullet points under each heading.
              * When you output the final text, use actual line breaks instead of \`\\n\`.
              * Ensure there is one blank line after each heading and one blank line between the end of one section's content and the next section's heading.
            
            Please apply these rules to the following text and output ONLY the reformatted text (no JSON, no code blocks, just the reformatted markdown):
            
            ${description}`;
  
      const response = await this.aiService.chat({
        messages: [{ role: 'user', content: reformatPrompt }],
        temperature: 0.3, // Lower temperature for more consistent formatting
        maxOutputTokens: 4096,
      });
  
      // Extract the reformatted text (remove any code blocks if present)
      let reformattedText = response.content.trim();
      
      // Remove markdown code blocks if present
      const codeBlockMatch = reformattedText.match(/```(?:markdown)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch && codeBlockMatch[1]) {
        reformattedText = codeBlockMatch[1].trim();
      }
      
      // Replace literal \n with actual newlines
      reformattedText = reformattedText.replace(/\\n/g, '\n');
      
      return reformattedText;
    } catch (error) {
      this.logger.error('Failed to reformat job description:', error);
      // If reformatting fails, just return the original with \n replaced
      return description.replace(/\\n/g, '\n');
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
