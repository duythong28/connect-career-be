import { BadRequestException, Injectable } from "@nestjs/common";
import { AIService } from "./ai.service";
import OpenAI from "openai";

export interface CVEnhancementPrompt {
  cv: any;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface DiffSegment {
  type: 'equal' | 'deletion' | 'suggestion';
  value: string;
}

export interface Suggestion {
  id: string;
  path: string;
  reason: string;
  diff: DiffSegment[];
}

export interface CVAssessment {
  cvAssessment: {
    content: Suggestion[];
    skills: Suggestion[];
    format: Suggestion[];
    section: Suggestion[];
    style: Suggestion[];
  };
}
@Injectable()
export class AICVEnhancementService {
    private readonly openai: OpenAI;
  constructor(private readonly aiService: AIService) {
    this.openai = new OpenAI({
        apiKey: process.env.GEMINI_API_KEY,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        maxRetries: 5,
        dangerouslyAllowBrowser: true,
      });
  }

  async enhanceCV(prompt: CVEnhancementPrompt): Promise<CVAssessment> {
    if (!prompt.cv) {
      throw new BadRequestException('CV data is required');
    }

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(prompt.cv);

    const response = await this.openai.chat.completions.create({
        model: 'gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: prompt.temperature ?? 0.3,
        max_completion_tokens: prompt.maxOutputTokens ?? 8192,
      });
    const content = response.choices[0]?.message?.content;
    if (!content || content.trim() === '') {
      throw new BadRequestException('No content received from AI service');
    }

    return this.parseResponse(content);
  }
  private buildSystemPrompt(): string {
    return `You are an Expert CV Review Agent. Your sole task is to analyze a user-provided CV in JSON format and return a single JSON object detailing actionable improvements.

            Your analysis MUST cover these 5 aspects:
            1.  **content**: Clarity, impact, action verbs, grammar, typos, and persuasiveness.
            2.  **skills**: Relevance, organization, duplication, and categorization.
            3.  **format**: Consistency (e.g., dates), readability, and structure.
            4.  **section**: Logical order, completeness, and necessity of CV sections.
            5.  **style**: Professional tone, conciseness, and word choice.

            **INPUT:**
            You will receive a JSON object representing the user's CV.

            **OUTPUT FORMAT:**
            Your response MUST be a single, valid JSON object. Do not include *any* text, pleasantries, or explanations before or after the JSON block.

            The root object must be \`cvAssessment\`, which contains keys for all 5 aspects. Each aspect's value must be an array of \`Suggestion\` objects.

            **\`Suggestion\` Object Structure:**
            {
            "id": "A unique string identifier for the suggestion (e.g., 'content-001').",
            "path": "A precise JSON path string pointing to the exact field in the original input that needs improvement (e.g., 'projects[1].responsibilities[0]', 'skills', 'personalInfo.title'). This path is critical for programmatic patching.",
            "reason": "A concise explanation of *why* the change is recommended. This will be shown to the user.",
            "diff": [
                // An array of \`DiffSegment\` objects that illustrates the change.
            ]
            }

            **\`DiffSegment\` Object Structure:**
            {
            "type": "A string: must be one of 'equal', 'deletion', or 'suggestion'.",
            "value": "The corresponding text or array item.
                        - 'equal': Unchanged segment.
                        - 'deletion': The 'bad point' to be removed.
                        - 'suggestion': The 'improved version' to be added."
            }

            **CRITICAL RULES:**
            1.  **Strict JSON Output:** Your entire response must be *only* the \`cvAssessment\` JSON object.
            2.  **Valid JSON Path:** The \`path\` MUST be 100% accurate and point to a valid location in the *input* CV JSON.
            3.  **Diff Logic:** The \`diff\` array must be structured so that concatenating all segments where \`type\` is 'equal' or 'suggestion' (and omitting 'deletion' segments) creates the complete, improved version of the field. For arrays (like 'skills'), each array element is a \`value\`.
            4.  **Empty Aspects:** If an aspect has no suggestions, you MUST return an empty array \`[]\` for that key. All 5 aspect keys must be present.

            **Example of Output:**
            If the input CV has \`... "responsibilities": ["Develop and implemented..."] ...\` at path \`projects[1].responsibilities[0]\`:
            {
            "cvAssessment": {
                "content": [
                {
                    "id": "content-001",
                    "path": "projects[1].responsibilities[0]",
                    "reason": "Action verbs for completed projects should be in the past tense (e.g., 'Developed') for consistency and professionalism.",
                    "diff": [
                    { "type": "deletion", "value": "Develop" },
                    { "type": "suggestion", "value": "Developed" },
                    { "type": "equal", "value": " and implemented CRUD APIs for managing courses, lessons, and grammar, integrated AWS S3 for file storage, and built features for the student homepage and course purchasing page on client side" }
                    ]
                }
                ],
                "skills": [],
                "format": [],
                "section": [],
                "style": []
            }
            }

            Now, wait for the user's CV JSON and begin your analysis.`;
  }
  private buildUserPrompt(cv: any): string {
    return `Here is the CV JSON to analyze:\n\n${JSON.stringify(cv, null, 2)}`;
  }

  private parseResponse(content: string): CVAssessment {
    try {
      // Clean markdown code fences if present
      const cleanedContent = content
        .replace(/^```(json\s*)?/i, '')
        .replace(/```$/i, '')
        .trim();

      if (!cleanedContent) {
        throw new BadRequestException('Empty response from AI service');
      }

      // Try to parse JSON directly
      let cvAssessment: CVAssessment;
      try {
        cvAssessment = JSON.parse(cleanedContent);
      } catch (parseError) {
        const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cvAssessment = JSON.parse(jsonMatch[0]);
        } else {
          throw new BadRequestException(
            `Failed to parse AI response as JSON. Response preview: ${cleanedContent.substring(0, 500)}`
          );
        }
      }

      // Validate the response structure
      if (!cvAssessment?.cvAssessment) {
        throw new BadRequestException('Invalid response structure from AI service. Missing cvAssessment property.');
      }

      // Validate that all required aspects are present
      const requiredAspects = ['content', 'skills', 'format', 'section', 'style'];
      const aspects = Object.keys(cvAssessment.cvAssessment);
      const missingAspects = requiredAspects.filter(
        (aspect) => !aspects.includes(aspect)
      );

      if (missingAspects.length > 0) {
        throw new BadRequestException(
          `Invalid response structure. Missing aspects: ${missingAspects.join(', ')}`
        );
      }

      return cvAssessment;
    } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException(
          `Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
}
