import { Injectable } from '@nestjs/common';
import { BaseAgent } from '../base.agent';
import { AIService } from 'src/shared/infrastructure/external-services/ai/services/ai.service';
import { AgentContext, AgentResult } from '../../types/agent.types';
import { ITool } from '../../interfaces/tool.interface';
import { CvToolsService } from '../../../infrastructure/tools/cv-tools.service';
import { EpisodicMemoryService } from '../../../infrastructure/memory/episodic-memory.service';
import { SemanticMemoryService } from '../../../infrastructure/memory/semantic-memory.service';

@Injectable()
export class InformationGatheringAgent extends BaseAgent {
  constructor(
    aiService: AIService,
    private readonly cvTools: CvToolsService,
    private readonly episodicMemory: EpisodicMemoryService,
    private readonly semanticMemory: SemanticMemoryService,
  ) {
    super(
      aiService,
      'InformationGatheringAgent',
      'Gathers and structures user information, preferences, and requirements through conversation',
      ['information_gathering', 'data_collection', 'profile_building', 'preference_capture'],
    );
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      const { task, entities, userId, conversationHistory } = context;

      // Determine what information to gather
      const gatheringType = entities?.gatheringType || this.detectGatheringType(task);

      // Retrieve existing user information from memory
      const existingInfo = await this.retrieveExistingInfo(userId);

      // Identify missing information
      const missingInfo = this.identifyMissingInfo(gatheringType, existingInfo, entities);

      if (missingInfo.length === 0 && Object.keys(existingInfo).length > 0) {
        // All information gathered, summarize
        return await this.summarizeInformation(existingInfo, context);
      }

      // Generate questions to gather missing information
      const questions = await this.generateQuestions(
        missingInfo,
        existingInfo,
        conversationHistory,
      );

      // Extract information from current conversation
      const extractedInfo = await this.extractInformation(
        task,
        conversationHistory,
        existingInfo,
      );

      // Merge extracted information
      const updatedInfo = { ...existingInfo, ...extractedInfo };

      // Store in memory
      if (userId) {
        await this.storeInformation(userId, updatedInfo);
      }

      return this.createSuccessResult(
        {
          gatheringType,
          currentInformation: updatedInfo,
          missingInformation: this.identifyMissingInfo(gatheringType, updatedInfo, entities),
          questions,
          isComplete: missingInfo.length === 0,
        },
        `Gathering ${gatheringType} information. ${questions.length > 0 ? `Next questions: ${questions.join(', ')}` : 'Information gathering complete.'}`,
        questions.length > 0 ? questions : ['Proceed with job search', 'Get recommendations'],
      );
    } catch (error) {
      return this.createErrorResult(
        [error instanceof Error ? error : new Error(String(error))],
        'Failed to gather information.',
      );
    }
  }

  canHandle(intent: string, entities?: Record<string, any>): boolean {
    return (
      intent === 'information_gathering' ||
      intent === 'data_collection' ||
      intent === 'profile_building' ||
      intent === 'preference_capture' ||
      intent.includes('gather') ||
      intent.includes('collect') ||
      intent.includes('ask')
    );
  }

  getTools(): ITool[] {
    return this.cvTools.getAllTools();
  }

  getRequiredMemory(): Array<'episodic' | 'semantic' | 'procedural'> {
    return ['episodic', 'semantic'];
  }

  private async retrieveExistingInfo(userId?: string): Promise<Record<string, any>> {
    const info: Record<string, any> = {};

    if (!userId) return info;

    try {
      // Get CV data
      if (userId) {
        try {
          const getCvTool = this.cvTools.getGetCvTool();
          const cvData = await getCvTool.execute({ userId });
          if (cvData) {
            info.skills = (cvData as any).skills || [];
            info.experience = (cvData as any).experience || [];
            info.education = (cvData as any).education || [];
            info.location = (cvData as any).location;
          }
        } catch (error) {
          this.logger.warn(`Could not retrieve CV: ${error}`);
        }
      }

      // Get from semantic memory
      if (userId) {
        try {
          const semanticKey = `${userId}:user_preferences`;
          const semanticData = await this.semanticMemory.retrieve(semanticKey);
          if (semanticData) {
            try {
              const parsed = typeof semanticData === 'string' ? JSON.parse(semanticData) : semanticData;
              Object.assign(info, parsed);
            } catch {
              if (typeof semanticData === 'string') {
                Object.assign(info, { preferences: semanticData });
              }
            }
          }
        } catch (error) {
          this.logger.warn(`Could not retrieve semantic memory: ${error}`);
        }
      }

      // Get from episodic memory
      if (userId) {
        try {
          const episodes = await this.episodicMemory.retrieveEvents(userId);
          episodes.slice(0, 10).forEach(episode => {
            if (episode && typeof episode === 'object' && 'metadata' in episode && (episode as any).metadata?.preferences) {
              Object.assign(info, (episode as any).metadata.preferences);
            }
          });
        } catch (error) {
          this.logger.warn(`Could not retrieve episodic memory: ${error}`);
        }
      }
    } catch (error) {
      this.logger.warn(`Could not retrieve existing info: ${error}`);
    }

    return info;
  }

  private identifyMissingInfo(
    gatheringType: string,
    existingInfo: Record<string, any>,
    entities?: Record<string, any>,
  ): string[] {
    const requiredFields: Record<string, string[]> = {
      job_search: ['skills', 'location', 'jobTitle', 'preferences'],
      profile: ['skills', 'experience', 'education'],
      preferences: ['location', 'salary', 'remote', 'industry'],
      complete: ['skills', 'experience', 'location', 'jobTitle', 'preferences'],
    };

    const fields = requiredFields[gatheringType] || requiredFields.complete;
    const missing: string[] = [];

    fields.forEach(field => {
      if (!existingInfo[field] && !entities?.[field]) {
        missing.push(field);
      }
    });

    return missing;
  }

  private async generateQuestions(
    missingInfo: string[],
    existingInfo: Record<string, any>,
    conversationHistory?: Array<{ role: string; content: string }>,
  ): Promise<string[]> {
    if (missingInfo.length === 0) return [];

    const prompt = `Generate natural, conversational questions to gather the following information:
Missing: ${missingInfo.join(', ')}
Already known: ${JSON.stringify(Object.keys(existingInfo))}

Generate 2-3 questions that feel natural and don't repeat information already discussed.
Return only the questions, one per line.`;

    const response = await this.callLLM(prompt, {
      systemPrompt: 'You are a friendly assistant gathering user information through conversation.',
    });

    return response
      .split('\n')
      .filter(line => line.trim().length > 0 && (line.includes('?') || line.match(/^[A-Z]/)))
      .slice(0, 3);
  }

  private async extractInformation(
    currentMessage: string,
    conversationHistory?: Array<{ role: string; content: string }>,
    existingInfo?: Record<string, any>,
  ): Promise<Record<string, any>> {
    const prompt = `Extract structured information from this conversation:

Current message: ${currentMessage}
Conversation history: ${JSON.stringify(conversationHistory?.slice(-5) || [], null, 2)}
Existing information: ${JSON.stringify(existingInfo || {}, null, 2)}

Extract and return ONLY a JSON object with any new information found. Include fields like:
- skills (array)
- location (string)
- jobTitle (string)
- preferences (object with salary, remote, industry, etc.)
- experience (array)
- education (array)

Return only valid JSON, no explanation.`;

    try {
      const response = await this.callLLM(prompt, {
        systemPrompt: 'You are an information extraction system. Return only valid JSON.',
        temperature: 0.3,
      });

      // Try to parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      this.logger.warn(`Failed to extract information: ${error}`);
    }

    return {};
  }

  private async summarizeInformation(
    info: Record<string, any>,
    context: AgentContext,
  ): Promise<AgentResult> {
    const summaryPrompt = `Summarize the following user information in a friendly, structured way:

${JSON.stringify(info, null, 2)}

Provide a clear summary that the user can review and confirm.`;

    const summary = await this.callLLM(summaryPrompt, {
      systemPrompt: 'You are a helpful assistant summarizing user information.',
    });

    return this.createSuccessResult(
      {
        information: info,
        summary,
        isComplete: true,
      },
      summary,
      ['Start job search', 'Get recommendations', 'Update information'],
    );
  }

  private async storeInformation(userId: string, info: Record<string, any>): Promise<void> {
    try {
      // Store preferences in semantic memory
      if (info.preferences) {
        await this.semanticMemory.store(userId, 'user_preferences', info.preferences);
      }

      // Store in episodic memory
      await this.episodicMemory.store(userId, {
        type: 'information_gathering',
        content: `User information updated: ${Object.keys(info).join(', ')}`,
        metadata: { information: info },
      });
    } catch (error) {
      this.logger.warn(`Failed to store information: ${error}`);
    }
  }

  private detectGatheringType(task: string): string {
    const lowerTask = task.toLowerCase();
    if (lowerTask.includes('profile')) return 'profile';
    if (lowerTask.includes('preference')) return 'preferences';
    if (lowerTask.includes('job') && lowerTask.includes('search')) return 'job_search';
    return 'complete';
  }
}