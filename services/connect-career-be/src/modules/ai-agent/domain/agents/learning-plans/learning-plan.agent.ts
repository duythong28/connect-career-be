import { Injectable } from '@nestjs/common';
import { BaseAgent } from '../base.agent';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';
import { AgentContext, AgentResult } from '../../types/agent.types';
import { ITool } from '../../interfaces/tool.interface';
import { LearningPathRagService } from '../../../infrastructure/rag/rag-services/learning-path-rag.service';
import { Intent } from '../../enums/intent.enum';

@Injectable()
export class LearningPlanAgent extends BaseAgent {
  constructor(
    aiService: AIService,
    private readonly learningPathRagService: LearningPathRagService,
  ) {
    super(
      aiService,
      'LearningPlanAgent',
      'Generates personalized learning roadmaps and skill development plans for career advancement',
      [
        Intent.LEARNING_PATH,
        Intent.CAREER_PATH,
        Intent.SKILL_GAP,
        'learning_roadmap',
        'skill_development',
        'career_roadmap',
        'upskilling_plan',
      ],
    );
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { task, entities, userId } = context;

      // Extract learning goals and current skills
      const targetRole =
        entities?.targetRole ||
        entities?.role ||
        entities?.jobTitle ||
        this.extractTargetRole(task);
      const currentSkills = entities?.currentSkills || entities?.skills || [];
      const learningGoal =
        entities?.learningGoal ||
        entities?.goal ||
        this.extractLearningGoal(task);
      const timeFrame = entities?.timeFrame || entities?.duration || '12 weeks';
      const level =
        entities?.level ||
        entities?.skillLevel ||
        this.inferSkillLevel(currentSkills);

      // Retrieve relevant learning resources from RAG
      const searchQuery = targetRole || learningGoal || task;
      const ragResults = await this.learningPathRagService.retrieve(
        searchQuery,
        {
          limit: 10,
          filters: {
            skill: targetRole || learningGoal,
            level: level as 'beginner' | 'intermediate' | 'advanced',
          },
          context: {
            conversationHistory: context.conversationHistory,
          },
        },
      );

      // Extract learning resources
      const learningResources = ragResults.map((result) => {
        try {
          return typeof result.content === 'string'
            ? JSON.parse(result.content)
            : result.content;
        } catch {
          return {
            title: result.metadata?.title || 'Learning Resource',
            content: result.content,
            metadata: result.metadata,
            score: result.score,
          };
        }
      });

      // Generate personalized learning roadmap
      const roadmapPrompt = `Create a comprehensive learning roadmap based on the following information:

**Target Role/Goal**: ${targetRole || learningGoal || 'Career advancement'}
**Current Skills**: ${JSON.stringify(currentSkills)}
**Time Frame**: ${timeFrame}
**Skill Level**: ${level}

**Available Learning Resources**:
${JSON.stringify(learningResources.slice(0, 8), null, 2)}

Generate a structured learning roadmap that includes:

1. **Overview**: Summary of the learning journey
2. **Current State Assessment**: Where the learner is now
3. **Target State**: Where they want to be
4. **Skill Gaps**: What needs to be learned
5. **Learning Phases**: Break down into phases (e.g., Foundation, Intermediate, Advanced)
6. **Weekly Breakdown**: Detailed week-by-week plan with:
   - Topics to cover
   - Learning resources (from available resources)
   - Practice exercises/projects
   - Milestones to achieve
7. **Resources**: Curated list of courses, tutorials, articles
8. **Practice Projects**: Hands-on projects for each phase
9. **Assessment**: How to measure progress
10. **Next Steps**: Immediate action items

Format as a clear, actionable roadmap that the learner can follow step-by-step. Make it motivating and achievable.`;

      const roadmap = await this.callLLM(roadmapPrompt, {
        systemPrompt:
          'You are an expert career coach and learning path designer. Create engaging, practical learning roadmaps that help people achieve their career goals. Think like Roadmap.sh - provide clear, structured paths with concrete steps.',
      });

      return this.createSuccessResult(
        {
          targetRole: targetRole || null,
          learningGoal: learningGoal || null,
          currentSkills,
          timeFrame,
          level,
          learningResources,
          roadmap,
          phases: this.extractPhases(roadmap),
        },
        roadmap,
        [
          'Get detailed resources for a phase',
          'Adjust timeline',
          'Find practice projects',
          'Track progress',
          'Explore related skills',
        ],
        {
          targetRole: targetRole || null,
          resourceCount: learningResources.length,
          timeFrame,
        },
      );
    } catch (error) {
      return this.createErrorResult(
        [error instanceof Error ? error : new Error(String(error))],
        'Failed to generate learning plan. Please try again.',
      );
    }
  }

  canHandle(intent: string, entities?: Record<string, any>): boolean {
    return (
      intent === Intent.LEARNING_PATH ||
      intent === Intent.CAREER_PATH ||
      intent === Intent.SKILL_GAP ||
      intent === 'learning_roadmap' ||
      intent === 'skill_development' ||
      intent === 'career_roadmap' ||
      intent === 'upskilling_plan' ||
      (intent.includes('learning') &&
        (intent.includes('plan') || intent.includes('path'))) ||
      intent.includes('roadmap') ||
      intent.includes('skill')
    );
  }

  getTools(): ITool[] {
    return []; // RAG service handles retrieval, no additional tools needed
  }

  getRequiredMemory(): Array<'episodic' | 'semantic' | 'procedural'> {
    return ['episodic', 'semantic', 'procedural'];
  }

  private extractTargetRole(text: string): string | null {
    const patterns = [
      /(?:become|be|learn|master)\s+(?:a|an)?\s*([A-Z][a-zA-Z\s]+?)(?:\s|$|,|\.)/,
      /(?:role|position|job)\s+(?:as|of)?\s*([A-Z][a-zA-Z\s]+?)(?:\s|$|,|\.)/,
      /(?:target|goal)\s+(?:role|position)?\s*:?\s*([A-Z][a-zA-Z\s]+?)(?:\s|$|,|\.)/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  private extractLearningGoal(text: string): string | null {
    const goalKeywords = [
      'learn',
      'master',
      'understand',
      'develop',
      'improve',
      'build',
      'create',
    ];
    const hasGoalKeyword = goalKeywords.some((keyword) =>
      text.toLowerCase().includes(keyword),
    );

    if (hasGoalKeyword) {
      // Extract the skill/topic after the goal keyword
      for (const keyword of goalKeywords) {
        const pattern = new RegExp(
          `${keyword}\\s+([a-zA-Z\\s]+?)(?:\\s|$|,|\\.)`,
          'i',
        );
        const match = text.match(pattern);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
    }

    return null;
  }

  private inferSkillLevel(
    skills: string[],
  ): 'beginner' | 'intermediate' | 'advanced' {
    if (!skills || skills.length === 0) return 'beginner';
    // Simple heuristic - can be enhanced
    if (skills.length < 3) return 'beginner';
    if (skills.length < 6) return 'intermediate';
    return 'advanced';
  }

  private extractPhases(roadmap: string): string[] {
    const phasePattern = /(?:Phase|Week|Stage)\s+\d+[:\-]?\s*([^\n]+)/gi;
    const phases: string[] = [];
    let match;

    while ((match = phasePattern.exec(roadmap)) !== null) {
      phases.push(match[1].trim());
    }

    return phases.length > 0
      ? phases
      : ['Foundation', 'Intermediate', 'Advanced'];
  }
}
