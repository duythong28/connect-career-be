import { Injectable } from '@nestjs/common';
import { BaseAgent } from '../base.agent';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';
import { AgentContext, AgentResult } from '../../types/agent.types';
import { ITool } from '../../interfaces/tool.interface';
import { JobRagService } from '../../../infrastructure/rag/rag-services/job-rag.service';
import { CvToolsService } from '../../../infrastructure/tools/cv-tools.service';
import { JobToolsService } from '../../../infrastructure/tools/job-tools.service';
import { Intent } from '../../enums/intent.enum';

@Injectable()
export class MatchingAgent extends BaseAgent {
  constructor(
    aiService: AIService,
    private readonly jobRagService: JobRagService,
    private readonly cvTools: CvToolsService,
    private readonly jobTools: JobToolsService,
  ) {
    super(
      aiService,
      'MatchingAgent',
      'Matches user profiles and CVs with job opportunities based on skills, experience, and preferences',
      [Intent.JOB_MATCHING, Intent.PROFILE_MATCHING, Intent.CV_MATCHING, Intent.SKILL_MATCHING],
    );
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { task, entities, userId } = context;

      // Extract user profile/CV information
      const userProfile = entities?.profile || entities?.cv || {};
      const jobCriteria = entities?.jobCriteria || {};

      // Get user CV if available
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

      // Extract skills and experience from CV or entities
      const skills =
        cvData?.skills || userProfile.skills || entities?.skills || [];
      const experience =
        cvData?.experience ||
        userProfile.experience ||
        entities?.experience ||
        [];
      const preferences = entities?.preferences || {};

      // Build search query from skills and preferences
      const searchQuery = this.buildSearchQuery(
        skills,
        preferences,
        jobCriteria,
      );

      // Retrieve matching jobs from RAG
      const ragResults = await this.jobRagService.retrieve(searchQuery, {
        limit: 20,
        filters: {
          location: preferences.location || jobCriteria.location,
          skills: skills,
        },
        context: {
          conversationHistory: context.conversationHistory,
        },
      });

      // Calculate match scores
      const jobsWithScores = await this.calculateMatchScores(
        ragResults,
        skills,
        experience,
        preferences,
      );

      // Sort by match score
      const topMatches = jobsWithScores
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 10);

      // Generate matching explanation
      const explanationPrompt = `Analyze the job matches and provide:
1. Why these jobs are good matches
2. Skills alignment analysis
3. Potential gaps and how to address them
4. Recommendations for improving match quality

Top matches:
${JSON.stringify(topMatches.slice(0, 5), null, 2)}

User skills: ${JSON.stringify(skills)}
User experience: ${JSON.stringify(experience)}`;

      const explanation = await this.callLLM(explanationPrompt, {
        systemPrompt:
          'You are a career matching expert providing detailed match analysis.',
      });

      return this.createSuccessResult(
        {
          matches: topMatches,
          totalMatches: jobsWithScores.length,
          matchSummary: {
            averageScore: this.calculateAverageScore(topMatches),
            skillCoverage: this.calculateSkillCoverage(topMatches, skills),
          },
        },
        explanation,
        [
          'View detailed job descriptions',
          'Get skill gap analysis',
          'Refine matching criteria',
          'Update profile for better matches',
        ],
        {
          matchedJobs: topMatches.length,
          searchQuery,
        },
      );
    } catch (error) {
      return this.createErrorResult(
        [error instanceof Error ? error : new Error(String(error))],
        'Failed to match jobs with user profile.',
      );
    }
  }

  canHandle(intent: string, entities?: Record<string, any>): boolean {
    return (
      intent === 'job_matching' ||
      intent === 'profile_matching' ||
      intent === 'cv_matching' ||
      intent === 'skill_matching' ||
      (intent.includes('match') &&
        (intent.includes('job') || intent.includes('profile')))
    );
  }

  getTools(): ITool[] {
    return [...this.cvTools.getAllTools(), ...this.jobTools.getAllTools()];
  }

  getRequiredMemory(): Array<'episodic' | 'semantic' | 'procedural'> {
    return ['episodic', 'semantic'];
  }

  private buildSearchQuery(
    skills: string[],
    preferences: Record<string, any>,
    jobCriteria: Record<string, any>,
  ): string {
    const parts: string[] = [];

    if (skills.length > 0) {
      parts.push(`skills: ${skills.slice(0, 5).join(', ')}`);
    }

    if (preferences.jobTitle || jobCriteria.jobTitle) {
      parts.push(preferences.jobTitle || jobCriteria.jobTitle);
    }

    if (preferences.industry || jobCriteria.industry) {
      parts.push(`industry: ${preferences.industry || jobCriteria.industry}`);
    }

    return parts.join(' ') || 'software engineer developer';
  }

  private async calculateMatchScores(
    jobs: any[],
    skills: string[],
    experience: any[],
    preferences: Record<string, any>,
  ): Promise<Array<{ job: any; matchScore: number; reasons: string[] }>> {
    return jobs.map((job) => {
      const jobData = job.value || job.content || job;
      const requiredSkills = jobData.requiredSkills || jobData.skills || [];
      const jobSkills = Array.isArray(requiredSkills) ? requiredSkills : [];

      // Calculate skill match percentage
      const matchedSkills = jobSkills.filter((skill: string) =>
        skills.some(
          (userSkill) =>
            userSkill.toLowerCase().includes(skill.toLowerCase()) ||
            skill.toLowerCase().includes(userSkill.toLowerCase()),
        ),
      );
      const skillMatchScore =
        jobSkills.length > 0 ? matchedSkills.length / jobSkills.length : 0;

      // Calculate experience match
      const experienceMatchScore = this.calculateExperienceMatch(
        experience,
        jobData,
      );

      // Calculate preference match
      const preferenceMatchScore = this.calculatePreferenceMatch(
        preferences,
        jobData,
      );

      // Weighted final score
      const matchScore =
        skillMatchScore * 0.5 +
        experienceMatchScore * 0.3 +
        preferenceMatchScore * 0.2;

      const reasons: string[] = [];
      if (skillMatchScore > 0.7) reasons.push('Strong skills match');
      if (experienceMatchScore > 0.7) reasons.push('Relevant experience');
      if (preferenceMatchScore > 0.7) reasons.push('Meets preferences');

      return {
        job: jobData,
        matchScore: Math.round(matchScore * 100) / 100,
        reasons,
      };
    });
  }

  private calculateExperienceMatch(experience: any[], jobData: any): number {
    if (!experience || experience.length === 0) return 0.5;

    const jobLevel = jobData.level || jobData.seniority || '';
    const userYears = experience.reduce((total, exp) => {
      const years = exp.years || 0;
      return total + years;
    }, 0);

    if (jobLevel.toLowerCase().includes('senior') && userYears >= 5) return 1.0;
    if (jobLevel.toLowerCase().includes('mid') && userYears >= 2) return 0.8;
    if (jobLevel.toLowerCase().includes('junior') && userYears < 3) return 0.9;

    return 0.6;
  }

  private calculatePreferenceMatch(
    preferences: Record<string, any>,
    jobData: any,
  ): number {
    let score = 0.5;
    let factors = 0;

    if (preferences.location && jobData.location) {
      factors++;
      if (
        jobData.location
          .toLowerCase()
          .includes(preferences.location.toLowerCase())
      ) {
        score += 0.3;
      }
    }

    if (preferences.salary && jobData.salary) {
      factors++;
      if (jobData.salary >= preferences.salary * 0.9) {
        score += 0.2;
      }
    }

    if (preferences.remote && jobData.remote) {
      factors++;
      score += 0.2;
    }

    return factors > 0 ? Math.min(score / factors, 1.0) : 0.5;
  }

  private calculateAverageScore(
    matches: Array<{ matchScore: number }>,
  ): number {
    if (matches.length === 0) return 0;
    const sum = matches.reduce((acc, m) => acc + m.matchScore, 0);
    return Math.round((sum / matches.length) * 100) / 100;
  }

  private calculateSkillCoverage(
    matches: Array<{ job: any }>,
    userSkills: string[],
  ): number {
    if (matches.length === 0 || userSkills.length === 0) return 0;

    const allRequiredSkills = new Set<string>();
    matches.forEach((match) => {
      const skills = match.job.requiredSkills || match.job.skills || [];
      skills.forEach((skill: string) =>
        allRequiredSkills.add(skill.toLowerCase()),
      );
    });

    const coveredSkills = Array.from(allRequiredSkills).filter((reqSkill) =>
      userSkills.some((userSkill) =>
        userSkill.toLowerCase().includes(reqSkill),
      ),
    );

    return allRequiredSkills.size > 0
      ? Math.round((coveredSkills.length / allRequiredSkills.size) * 100) / 100
      : 0;
  }
}
