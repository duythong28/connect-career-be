import { Injectable } from '@nestjs/common';
import { BaseAgent } from '../base.agent';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';
import { AgentContext, AgentResult } from '../../types/agent.types';
import { ITool } from '../../interfaces/tool.interface';
import { CvToolsService } from '../../../infrastructure/tools/cv-tools.service';
import { Intent } from '../../enums/intent.enum';

@Injectable()
export class CvEnhancementAgent extends BaseAgent {
  constructor(
    aiService: AIService,
    private readonly cvTools: CvToolsService,
  ) {
    super(
      aiService,
      'CvEnhancementAgent',
      'Helps candidates enhance and improve their CV/resume based on job requirements and best practices',
      [
        Intent.CV_REVIEW,
        'cv_enhancement',
        'improve_cv',
        'cv_optimization',
        'resume_improvement',
      ],
    );
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { task, entities, userId } = context;

      // Extract CV content and job description if provided
      const cvContent = entities?.cvContent || entities?.cv || task;
      const jobDescription = entities?.jobDescription || entities?.job || '';

      // Get CV data if userId is available
      let cvData: any = null;
      if (userId) {
        const getCvTool = this.cvTools.getGetCvTool();
        try {
          cvData = await getCvTool.execute({ userId });
        } catch (error) {
          this.logger.warn(
            `Could not retrieve CV for user ${userId}: ${error}`,
          );
        }
      }

      // Use CV content from entities or retrieved CV
      const finalCvContent =
        cvContent !== task && cvContent
          ? cvContent
          : cvData?.content || cvContent;

      // Analyze CV first
      const analyzeCvTool = this.cvTools.getAnalyzeCvTool();
      const analysis = await analyzeCvTool.execute({
        cvContent: finalCvContent,
        userId,
      });

      // Enhance CV based on job description if provided
      const enhanceCvTool = this.cvTools.getEnhanceCvTool();
      const enhancement = await enhanceCvTool.execute({
        cvContent: finalCvContent,
        jobDescription,
      });

      // Generate comprehensive improvement suggestions
      const improvementPrompt = `Analyze the CV and provide detailed enhancement recommendations:

Current CV Analysis:
${JSON.stringify(analysis, null, 2)}

Enhancement Suggestions:
${JSON.stringify(enhancement, null, 2)}

${jobDescription ? `Target Job Description:\n${jobDescription}\n` : ''}

Provide:
1. **Key Strengths**: What's working well in the CV
2. **Areas for Improvement**: Specific sections that need work
3. **ATS Optimization**: Suggestions for better ATS compatibility
4. **Content Enhancements**: Concrete improvements for each section
5. **Keyword Optimization**: Relevant keywords to include
6. **Action Items**: Prioritized list of improvements
${jobDescription ? '7. **Job Alignment**: How well the CV matches the target job' : ''}

Format the response in a clear, actionable way.`;

      const recommendations = await this.callLLM(improvementPrompt, {
        systemPrompt:
          'You are an expert CV/resume consultant specializing in ATS optimization and career advancement. Provide actionable, specific advice.',
      });

      return this.createSuccessResult(
        {
          analysis,
          enhancement,
          recommendations,
          cvData: cvData || { content: finalCvContent },
          jobDescription: jobDescription || null,
        },
        recommendations,
        [
          'View detailed CV analysis',
          'Get ATS optimization tips',
          'Generate improved CV sections',
          'Compare with job requirements',
        ],
        {
          hasJobDescription: !!jobDescription,
          cvLength: finalCvContent?.length || 0,
        },
      );
    } catch (error) {
      return this.createErrorResult(
        [error instanceof Error ? error : new Error(String(error))],
        'Failed to enhance CV. Please try again.',
      );
    }
  }

  canHandle(intent: string, entities?: Record<string, any>): boolean {
    return (
      intent === Intent.CV_REVIEW ||
      intent === 'cv_enhancement' ||
      intent === 'improve_cv' ||
      intent === 'cv_optimization' ||
      intent === 'resume_improvement' ||
      (intent.includes('cv') && intent.includes('improve')) ||
      (intent.includes('resume') && intent.includes('enhance'))
    );
  }

  getTools(): ITool[] {
    return this.cvTools.getAllTools();
  }

  getRequiredMemory(): Array<'episodic' | 'semantic' | 'procedural'> {
    return ['episodic', 'semantic'];
  }
}