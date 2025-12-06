import { Injectable } from '@nestjs/common';
import { BaseAgent } from '../base.agent';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';
import { AgentContext, AgentResult } from '../../types/agent.types';
import { ITool } from '../../interfaces/tool.interface';
import { CvToolsService } from '../../../infrastructure/tools/cv-tools.service';
import { MultiRagService } from '../../../infrastructure/rag/rag-services/multi-rag.service';
import { JobRagService } from '../../../infrastructure/rag/rag-services/job-rag.service';

@Injectable()
export class AnalysisAgent extends BaseAgent {
  constructor(
    aiService: AIService,
    private readonly cvTools: CvToolsService,
    private readonly multiRagService: MultiRagService,
    private readonly jobRagService: JobRagService,
  ) {
    super(
      aiService,
      'AnalysisAgent',
      'Analyzes CVs, skills, job requirements, and provides insights and recommendations',
      ['cv_analysis', 'skill_analysis', 'job_analysis', 'gap_analysis', 'career_analysis'],
    );
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { task, entities, userId } = context;

      // Determine analysis type
      const analysisType = entities?.analysisType || this.detectAnalysisType(task);

      switch (analysisType) {
        case 'cv':
          return await this.analyzeCv(context, userId);
        case 'skills':
          return await this.analyzeSkills(context, entities);
        case 'job':
          return await this.analyzeJob(context, entities);
        case 'gap':
          return await this.analyzeGap(context, userId, entities);
        default:
          return await this.comprehensiveAnalysis(context, userId, entities);
      }
    } catch (error) {
      return this.createErrorResult(
        [error instanceof Error ? error : new Error(String(error))],
        'Failed to perform analysis.',
      );
    }
  }

  canHandle(intent: string, entities?: Record<string, any>): boolean {
    return (
      intent === 'cv_analysis' ||
      intent === 'skill_analysis' ||
      intent === 'job_analysis' ||
      intent === 'gap_analysis' ||
      intent === 'career_analysis' ||
      intent.includes('analyze') ||
      intent.includes('analysis')
    );
  }

  getTools(): ITool[] {
    return this.cvTools.getAllTools();
  }

  getRequiredMemory(): Array<'episodic' | 'semantic' | 'procedural'> {
    return ['episodic', 'semantic', 'procedural'];
  }

  private async analyzeCv(context: AgentContext, userId?: string): Promise<AgentResult> {
    // Get CV data
    let cvData = null;
    if (userId) {
      const getCvTool = this.cvTools.getGetCvTool();
      try {
        cvData = await getCvTool.execute({ userId });
      } catch (error) {
        this.logger.warn(`Could not retrieve CV: ${error}`);
      }
    }

    if (!cvData && !context.entities?.cv) {
      return this.createErrorResult(
        [new Error('No CV data available for analysis')],
        'Please provide CV data or user ID for analysis.',
      );
    }

    const cv = cvData || context.entities?.cv;

    // Analyze CV structure and content
    const analysisPrompt = `Analyze the following CV and provide:
1. Strengths and highlights
2. Areas for improvement
3. Missing information
4. Formatting and presentation feedback
5. Keyword optimization suggestions
6. ATS (Applicant Tracking System) compatibility score

CV Data:
${JSON.stringify(cv, null, 2)}`;

    const analysis = await this.callLLM(analysisPrompt, {
      systemPrompt: 'You are a professional CV reviewer and career advisor.',
    });

    return this.createSuccessResult(
      {
        analysisType: 'cv',
        cvData: cv,
        analysis,
        recommendations: this.extractRecommendations(analysis),
      },
      analysis,
      ['Update CV', 'Get skill gap analysis', 'Find matching jobs'],
    );
  }

  private async analyzeSkills(context: AgentContext, entities?: Record<string, any>): Promise<AgentResult> {
    const skills = entities?.skills || [];

    if (skills.length === 0) {
      return this.createErrorResult(
        [new Error('No skills provided for analysis')],
        'Please provide skills to analyze.',
      );
    }

    // Get market insights for these skills
    const marketInsights = await this.multiRagService.retrieve(
      `skills demand market trends ${skills.join(' ')}`,
      ['job', 'learning'],
      { limitPerDomain: 5 },
    );

    const analysisPrompt = `Analyze the following skills and provide:
1. Market demand and trends
2. Skill level assessment
3. Complementary skills to learn
4. Career paths that use these skills
5. Salary impact of these skills

Skills: ${JSON.stringify(skills)}
Market Insights: ${JSON.stringify(marketInsights.results.slice(0, 10), null, 2)}`;

    const analysis = await this.callLLM(analysisPrompt, {
      systemPrompt: 'You are a skills and career market analyst.',
    });

    return this.createSuccessResult(
      {
        analysisType: 'skills',
        skills,
        marketInsights: marketInsights.results,
        analysis,
      },
      analysis,
      ['Find jobs matching these skills', 'Get learning recommendations'],
    );
  }

  private async analyzeJob(context: AgentContext, entities?: Record<string, any>): Promise<AgentResult> {
    const jobId = entities?.jobId;
    const jobData = entities?.job;

    if (!jobId && !jobData) {
      return this.createErrorResult(
        [new Error('No job data provided')],
        'Please provide job ID or job data for analysis.',
      );
    }

    // Retrieve job details if only ID provided
    let job = jobData;
    if (jobId && !jobData) {
      const results = await this.jobRagService.retrieve(`job id ${jobId}`, { limit: 1 });
      if (results[0]) {
        try {
          job = typeof results[0].content === 'string' ? JSON.parse(results[0].content) : results[0].content;
        } catch {
          job = results[0].content;
        }
      }
    }

    const analysisPrompt = `Analyze the following job posting and provide:
1. Key requirements and qualifications
2. Nice-to-have vs must-have skills
3. Company culture indicators
4. Growth opportunities
5. Potential challenges
6. Application tips

Job Data:
${JSON.stringify(job, null, 2)}`;

    const analysis = await this.callLLM(analysisPrompt, {
      systemPrompt: 'You are a job market analyst and career advisor.',
    });

    return this.createSuccessResult(
      {
        analysisType: 'job',
        job,
        analysis,
      },
      analysis,
      ['Check if I match this job', 'Get application tips'],
    );
  }

  private async analyzeGap(
    context: AgentContext,
    userId?: string,
    entities?: Record<string, any>,
  ): Promise<AgentResult> {
    // Get user CV
    let cvData = null;
    if (userId) {
      const getCvTool = this.cvTools.getGetCvTool();
      try {
        cvData = await getCvTool.execute({ userId });
      } catch (error) {
        this.logger.warn(`Could not retrieve CV: ${error}`);
      }
    }

    const userSkills = (cvData as any)?.skills || entities?.skills || [];
    const targetJob = entities?.targetJob || entities?.job;

    if (userSkills.length === 0 || !targetJob) {
      return this.createErrorResult(
        [new Error('Insufficient data for gap analysis')],
        'Please provide user skills and target job for gap analysis.',
      );
    }

    const requiredSkills = targetJob.requiredSkills || targetJob.skills || [];

    // Find skill gaps
    const gaps = requiredSkills.filter(
      (reqSkill: string) =>
        !userSkills.some(
          userSkill =>
            userSkill.toLowerCase().includes(reqSkill.toLowerCase()) ||
            reqSkill.toLowerCase().includes(userSkill.toLowerCase()),
        ),
    );

    // Get learning recommendations for gaps
    const learningResults = await this.multiRagService.retrieve(
      `learn ${gaps.join(' ')} courses tutorials`,
      ['learning'],
      { limitPerDomain: 10 },
    );

    const analysisPrompt = `Perform a skill gap analysis:

User Skills: ${JSON.stringify(userSkills)}
Required Skills: ${JSON.stringify(requiredSkills)}
Skill Gaps: ${JSON.stringify(gaps)}

Provide:
1. Gap analysis summary
2. Priority skills to learn
3. Learning path recommendations
4. Timeline estimates
5. Alternative approaches`;

    const analysis = await this.callLLM(analysisPrompt, {
      systemPrompt: 'You are a career development and learning path advisor.',
    });

    return this.createSuccessResult(
      {
        analysisType: 'gap',
        userSkills,
        requiredSkills,
        gaps,
        learningResources: learningResults.results,
        analysis,
      },
      analysis,
      ['Get learning path', 'Find similar jobs with current skills'],
    );
  }

  private async comprehensiveAnalysis(
    context: AgentContext,
    userId?: string,
    entities?: Record<string, any>,
  ): Promise<AgentResult> {
    // Perform multiple analyses
    const cvAnalysis = userId ? await this.analyzeCv(context, userId) : null;
    const skillsAnalysis = entities?.skills
      ? await this.analyzeSkills(context, entities)
      : null;

    const comprehensivePrompt = `Provide a comprehensive career analysis based on:
${cvAnalysis ? `CV Analysis: ${JSON.stringify(cvAnalysis.data)}` : ''}
${skillsAnalysis ? `Skills Analysis: ${JSON.stringify(skillsAnalysis.data)}` : ''}

Provide overall career recommendations and next steps.`;

    const comprehensiveAnalysis = await this.callLLM(comprehensivePrompt, {
      systemPrompt: 'You are a comprehensive career advisor.',
    });

    return this.createSuccessResult(
      {
        analysisType: 'comprehensive',
        cvAnalysis: cvAnalysis?.data,
        skillsAnalysis: skillsAnalysis?.data,
        comprehensiveAnalysis,
      },
      comprehensiveAnalysis,
      ['Get job matches', 'Create learning plan', 'Update profile'],
    );
  }

  private detectAnalysisType(task: string): string {
    const lowerTask = task.toLowerCase();
    if (lowerTask.includes('cv') || lowerTask.includes('resume')) return 'cv';
    if (lowerTask.includes('skill')) return 'skills';
    if (lowerTask.includes('job') && lowerTask.includes('gap')) return 'gap';
    if (lowerTask.includes('job')) return 'job';
    if (lowerTask.includes('gap')) return 'gap';
    return 'comprehensive';
  }

  private extractRecommendations(analysis: string): string[] {
    // Simple extraction - can be enhanced with LLM
    const lines = analysis.split('\n');
    return lines
      .filter(line => line.includes('recommend') || line.includes('suggest') || line.includes('should'))
      .slice(0, 5);
  }
}