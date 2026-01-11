import { BadRequestException, Injectable } from '@nestjs/common';
import { AIService } from './ai.service';
import OpenAI from 'openai';

export interface CVEnhancementPrompt {
  cv: any;
  jobDescription: string;
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
    if (!prompt.jobDescription) {
      throw new BadRequestException('Job description is required');
    }

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(prompt.cv, prompt.jobDescription);

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
      max_completion_tokens: prompt.maxOutputTokens ?? 32768,
    });
    const content = response.choices[0]?.message?.content;
    if (!content || content.trim() === '') {
      throw new BadRequestException('No content received from AI service');
    }

    return this.parseResponse(content);
  }
  private buildSystemPrompt(): string {
    return `You are an Expert CV Review Agent. Your sole task is to analyze a user-provided CV in JSON format against a specific job description and return a single JSON object detailing actionable improvements tailored to that role.

            Your analysis MUST cover these 5 aspects with a focus on alignment to the job description:
            1.  **content**: Clarity, impact, action verbs, grammar, typos, and persuasiveness. Prioritize improvements that highlight experiences and achievements relevant to the job description.
            2.  **skills**: Relevance to the job description, organization, duplication, and categorization. Identify missing skills from the job requirements and suggest adding relevant skills that match the role.
            3.  **format**: Consistency (e.g., dates), readability, and structure. Ensure the format optimizes ATS (Applicant Tracking System) parsing for job applications.
            4.  **section**: Logical order, completeness, and necessity of CV sections. Ensure all sections that would be valuable for this specific role are present and well-structured.
            5.  **style**: Professional tone, conciseness, and word choice. Adjust style to match industry expectations for the role described in the job description.

            **INPUT:**
            You will receive:
            1. A JSON object representing the user's CV.
            2. A job description for the target role.

            **JOB-DESCRIPTION-BASED ENHANCEMENT RULES:**
            - Prioritize CV improvements that directly align with the job requirements and qualifications listed in the job description.
            - Identify keywords and phrases from the job description and suggest incorporating them naturally into the CV where relevant.
            - Highlight experiences, skills, and achievements that match the job description requirements.
            - Suggest adding missing skills that are explicitly mentioned or implied in the job description.
            - Recommend rephrasing work experience and responsibilities to better match the language and terminology used in the job description.
            - Focus on demonstrating fit for the specific role rather than generic CV improvements.

            **OUTPUT FORMAT:**
            Your response MUST be a single, valid JSON object. Do not include *any* text, pleasantries, or explanations before or after the JSON block.

            The root object must be \`cvAssessment\`, which contains keys for all 5 aspects. Each aspect's value must be an array of \`Suggestion\` objects.

            **\`Suggestion\` Object Structure:**
            {
            "id": "A unique string identifier for the suggestion (e.g., 'content-001').",
            "path": "A precise JSON path string pointing to the exact field in the original input that needs improvement (e.g., 'projects[1].responsibilities[0]', 'skills', 'personalInfo.title'). This path is critical for programmatic patching.",
            "reason": "A concise explanation of *why* the change is recommended, specifically referencing how it aligns with the job description requirements. This will be shown to the user.",
            "diff": [
                // An array of \`DiffSegment\` objects that illustrates the change.
            ]
            }

            **\`DiffSegment\` Object Structure:**
            {
            "type": "A string: must be one of 'equal', 'deletion', or 'suggestion'.",
            "value": "The corresponding value must be a string. Follow these rules:
                        - 'equal': Unchanged segment.
                        - 'deletion': The 'bad point' to be removed.
                        - 'suggestion': The 'improved version' to be added."
            }

            **CRITICAL RULES:**
            1.  **Strict JSON Output:** Your entire response must be *only* the \`cvAssessment\` JSON object.
            2.  **Valid JSON Path:** The \`path\` MUST be 100% accurate and point to a valid location in the *input* CV JSON.
            3.  **Diff Logic:** The \`diff\` array must be structured so that concatenating all segments where \`type\` is 'equal' or 'suggestion' (and omitting 'deletion' segments) creates the complete, improved version of the field. For arrays (like 'skills'), each array element is a \`value\`.
            4.  **Empty Aspects:** If an aspect has no suggestions, you MUST return an empty array \`[]\` for that key. All 5 aspect keys must be present.
            5.  **Job Description Context:** All suggestions should be made with the job description in mind. Explain in the \`reason\` field how each suggestion improves alignment with the job requirements.

            **Example of Output:**
            If the job description requires "experience with microservices architecture" and the input CV has \`... "responsibilities": ["Develop and implemented web applications..."] ...\` at path \`workExperience[0].responsibilities[0]\`:
            {
            "cvAssessment": {
              "content": [
                {
                  "id": "content-001",
                  "path": "projects[0].description",
                  "reason": "Using active voice ('Developed...') is more direct and impactful than passive voice ('A web application was developed...').",
                  "diff": [
                    { "type": "deletion", "value": "A web application was developed" },
                    { "type": "suggestion", "value": "Developed a web application" },
                    { "type": "equal", "value": " with scalable features, allowing users to browse, book, and manage rental properties. The project mimicked real-world functionalities such as property listings, user authentication using JWT and OAuth2, bookings, reviews. Firebase Cloud Storage was used for storing property images and other media files, ensuring high availability and durability." }
                  ]
                },
                {
                  "id": "content-002",
                  "path": "projects[0].responsibilities[0]",
                  "reason": "This clarifies that you worked on multiple APIs and uses the standard 'server-side' term.",
                  "diff": [
                    { "type": "equal", "value": "Designed and implemented API" },
                    { "type": "suggestion", "value": "s" },
                    { "type": "equal", "value": " in" },
                    { "type": "deletion", "value": " server side" },
                    { "type": "suggestion", "value": " server-side" },
                    { "type": "equal", "value": "." }
                  ]
                },
                {
                  "id": "content-003",
                  "path": "projects[1].responsibilities[0]",
                  "reason": "Action verbs for completed projects should be in the past tense (e.g., 'Developed') for consistency and professionalism.",
                  "diff": [
                    { "type": "deletion", "value": "Develop" },
                    { "type": "suggestion", "value": "Developed" },
                    { "type": "equal", "value": " and implemented CRUD APIs for managing courses, lessons, and grammar, integrated AWS S3 for file storage, and built features for the student homepage and course purchasing page on client side" }
                  ]
                }
              ],
              "skills": [
                {
                  "id": "skills-001",
                  "path": "skills",
                  "reason": "Duplicate skill 'Javascript' found. It's best to standardize casing to 'JavaScript' (already present) and remove duplicates.",
                  "diff": [
                    { "type": "equal", "value": "C#" },
                    { "type": "equal", "value": "Java" },
                    { "type": "equal", "value": "JavaScript" },
                    { "type": "equal", "value": "Typescript" },
                    { "type": "equal", "value": "React" },
                    { "type": "equal", "value": "Redux" },
                    { "type": "equal", "value": "HTML5" },
                    { "type": "equal", "value": "CSS3" },
                    { "type": "deletion", "value": "Javascript" },
                    { "type": "equal", "value": "NestJS" },
                    { "type": "equal", "value": "NodeJS" },
                    { "type": "equal", "value": "ExpressJS" },
                    { "type": "equal", "value": "ASP.NET Core API" },
                    { "type": "equal", "value": "Java Spring Boot" },
                    { "type": "equal", "value": "PostgreSQL" },
                    { "type": "equal", "value": "SQL Server" },
                    { "type": "equal", "value": "MySQL" },
                    { "type": "equal", "value": "MongoDB" },
                    { "type": "equal", "value": "AWS" },
                    { "type": "equal", "value": "EC2" },
                    { "type": "equal", "value": "Docker" },
                    { "type": "equal", "value": "Github" },
                    { "type": "equal", "value": "Postman" },
                    { "type": "equal", "value": "Jira" }
                  ]
                }
              ],
              "format": [
                {
                  "id": "format-001",
                  "path": "personalInfo.address",
                  "reason": "Proper nouns like 'City' should be capitalized for professional formatting.",
                  "diff": [
                    { "type": "equal", "value": "Thu Duc, Ho Chi Minh " },
                    { "type": "deletion", "value": "city" },
                    { "type": "suggestion", "value": "City" }
                  ]
                }
              ],
              "section": [
                {
                  "id": "section-001",
                  "path": "personalInfo.links[1].url",
                  "reason": "A professional profile link (like LinkedIn) is essential for many roles. Recruiters frequently use it to verify experience and connect. Please add your profile URL.",
                  "diff": [
                    { "type": "deletion", "value": "" },
                    { "type": "suggestion", "value": "https://www.linkedin.com/in/your-profile-url" }
                  ]
                }
              ],
              "style": [
                {
                  "id": "style-001",
                  "path": "workExperience[0].responsibilities[0]",
                  "reason": "Using an active '-ing' verb ('Collaborating') strengthens the description of a current, ongoing responsibility.",
                  "diff": [
                    { "type": "deletion", "value": "Collaborate" },
                    { "type": "suggestion", "value": "Collaborating" },
                    { "type": "equal", "value": " with multiple Departments' members to maintain project Webdev Adventure for the club." }
                  ]
                },
                {
                  "id": "style-002",
                  "path": "awards[0].description",
                  "reason": "This phrasing is more professional, formal, and clearly describes the achievement.",
                  "diff": [
                    { "type": "deletion", "value": "Three times, with 1st, 2nd and 4th semesters." },
                    { "type": "suggestion", "value": "Awarded for outstanding academic performance in Semester 1, Semester 2, and Semester 4." }
                  ]
                },
                {
                  "id": "style-003",
                  "path": "awards[2].description",
                  "reason": "Providing context for the score (e.g., 'Overall Band') makes the entry clearer and more professional.",
                  "diff": [
                    { "type": "deletion", "value": "5.5" },
                    { "type": "suggestion", "value": "Overall Band 5.5" }
                  ]
                }
              ]
            }
          }

            Now, wait for the CV JSON and job description, then begin your analysis.`;
  }
  private buildUserPrompt(cv: any, jobDescription: string): string {
    return `**Job Description:**
${jobDescription}

**CV JSON to analyze:**
${JSON.stringify(cv, null, 2)}

Please analyze the CV against the job description above and provide suggestions for enhancement.`;
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
            `Failed to parse AI response as JSON. Response preview: ${cleanedContent.substring(0, 500)}`,
          );
        }
      }

      // Validate the response structure
      if (!cvAssessment?.cvAssessment) {
        throw new BadRequestException(
          'Invalid response structure from AI service. Missing cvAssessment property.',
        );
      }

      // Validate that all required aspects are present
      const requiredAspects = [
        'content',
        'skills',
        'format',
        'section',
        'style',
      ];
      const aspects = Object.keys(cvAssessment.cvAssessment);
      const missingAspects = requiredAspects.filter(
        (aspect) => !aspects.includes(aspect),
      );

      if (missingAspects.length > 0) {
        throw new BadRequestException(
          `Invalid response structure. Missing aspects: ${missingAspects.join(', ')}`,
        );
      }

      return cvAssessment;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
