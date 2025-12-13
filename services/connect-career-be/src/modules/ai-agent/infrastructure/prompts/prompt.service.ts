import { Injectable } from '@nestjs/common';
import {
  RoleDetectionPrompts,
  IntentDetectionPrompts,
  ResponseSynthesisPrompts,
  GraphBuilderPrompts,
} from './orchestration-prompts';
import {
  FaqAgentPrompts,
  JobDiscoveryAgentPrompts,
  MatchingAgentPrompts,
  AnalysisAgentPrompts,
  ComparisonAgentPrompts,
  InformationGatheringAgentPrompts,
  OrchestratorAgentPrompts,
  ChainsServicePrompts,
} from './agent-prompts';
import {
  QueryRewriterPrompts,
  QueryExpanderPrompts,
  CrossEncoderRankerPrompts,
} from './rag-prompts';
import { SuggestionPrompts } from './suggestion-prompts';

/**
 * Centralized Prompt Service
 * Provides access to all prompts in the AI agent module
 */
@Injectable()
export class PromptService {
  // Orchestration Prompts
  getRoleDetectionSystemPrompt(): string {
    return RoleDetectionPrompts.system;
  }

  getRoleDetectionUserPrompt(message: string, historyContext?: string): string {
    return RoleDetectionPrompts.user(message, historyContext);
  }

  getIntentDetectionSystemPrompt(
    role: 'candidate' | 'recruiter' | undefined,
    intentList: string,
  ): string {
    return IntentDetectionPrompts.system(role, intentList);
  }

  getIntentDetectionUserPrompt(
    message: string,
    historyContext?: string,
    userContext?: any,
  ): string {
    return IntentDetectionPrompts.user(message, historyContext, userContext);
  }

  getIntentList(role: 'candidate' | 'recruiter' | undefined): string {
    return role === 'recruiter'
      ? IntentDetectionPrompts.recruiterIntents
      : IntentDetectionPrompts.candidateIntents;
  }

  getResponseSynthesisSystemPrompt(): string {
    return ResponseSynthesisPrompts.system;
  }

  getResponseSynthesisUserPrompt(
    originalRequest: string,
    resultsSummary: string,
    conversationContext?: string,
  ): string {
    return ResponseSynthesisPrompts.user(
      originalRequest,
      resultsSummary,
      conversationContext,
    );
  }

  getGraphBuilderSystemPrompt(role: 'candidate' | 'recruiter'): string {
    return GraphBuilderPrompts.system(role);
  }

  getGraphBuilderUserPrompt(
    userText: string, 
    contextInfo?: string,
    userProfileInfo?: string,
    conversationHistory?: string,
  ): string {
    return GraphBuilderPrompts.user(userText, contextInfo, userProfileInfo, conversationHistory);
  }

  // Agent Prompts
  getFaqAgentSystemPrompt(): string {
    return FaqAgentPrompts.system;
  }

  getFaqAgentUserPrompt(question: string, faqContext: string): string {
    return FaqAgentPrompts.user(question, faqContext);
  }

  getJobDiscoverySystemPrompt(): string {
    return JobDiscoveryAgentPrompts.system;
  }

  getJobDiscoveryUserPrompt(userProfile: string, jobListings: string): string {
    return JobDiscoveryAgentPrompts.user(userProfile, jobListings);
  }

  getMatchingSystemPrompt(): string {
    return MatchingAgentPrompts.system;
  }

  getMatchingUserPrompt(
    userProfile: string,
    jobMatches: string,
    analysisType: 'job_match' | 'cv_match' | 'skill_match',
  ): string {
    return MatchingAgentPrompts.user(userProfile, jobMatches, analysisType);
  }

  getAnalysisPrompts() {
    return AnalysisAgentPrompts;
  }

  getComparisonSystemPrompt(): string {
    return ComparisonAgentPrompts.system;
  }

  getComparisonUserPrompt(
    items: string,
    comparisonType: 'jobs' | 'companies' | 'offers',
  ): string {
    return ComparisonAgentPrompts.user(items, comparisonType);
  }

  getInformationGatheringPrompts() {
    return InformationGatheringAgentPrompts;
  }

  getOrchestratorSystemPrompt(): string {
    return OrchestratorAgentPrompts.system;
  }

  getOrchestratorUserPrompt(task: string, availableAgents: string): string {
    return OrchestratorAgentPrompts.user(task, availableAgents);
  }

  getChainsServiceAgentPrompt(
    agentName: string,
    agentDescription: string,
    capabilities: string[],
  ): string {
    return ChainsServicePrompts.agentChain(
      agentName,
      agentDescription,
      capabilities,
    );
  }

  getChainsServiceDefaultSystemPrompt(): string {
    return ChainsServicePrompts.defaultSystem;
  }

  // RAG Prompts
  getQueryRewriterSystemPrompt(): string {
    return QueryRewriterPrompts.system;
  }

  getQueryRewriterUserPrompt(
    query: string,
    conversationHistory?: string,
    domain?: 'job' | 'company' | 'learning' | 'faq',
  ): string {
    return QueryRewriterPrompts.user(query, conversationHistory, domain);
  }

  getQueryExpanderSystemPrompt(): string {
    return QueryExpanderPrompts.system;
  }

  getQueryExpanderUserPrompt(
    query: string,
    maxExpansions?: number,
    domain?: 'job' | 'company' | 'learning' | 'faq',
  ): string {
    return QueryExpanderPrompts.user(query, maxExpansions, domain);
  }

  getCrossEncoderRankerSystemPrompt(): string {
    return CrossEncoderRankerPrompts.system;
  }

  getCrossEncoderRankerUserPrompt(query: string, document: string): string {
    return CrossEncoderRankerPrompts.user(query, document);
  }

  // Suggestion Prompts
  getSuggestionSystemPrompt(): string {
    return SuggestionPrompts.system;
  }

  getSuggestionUserPrompt(context?: string, activitySummary?: string): string {
    return SuggestionPrompts.user(context, activitySummary);
  }

  /**
   * Helper method to clean JSON responses from LLM
   * Removes markdown code fences and extracts JSON
   */
  cleanJsonResponse(content: string): string {
    // Remove markdown code fences
    let cleaned = content
      .replace(/^```(json\s*)?/i, '')
      .replace(/```$/i, '')
      .trim();

    // Try to extract JSON if there's extra text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    return cleaned;
  }
}
