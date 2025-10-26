export interface Analytics {
  overallScore: number;
  overallFeedback: string;
  communication: {
    score: number;
    feedback: string;
  };
  generallIntelligence: string;
  softSkillSummary: string;
  questionSummaries: Array<{
    question: string;
    summary: string;
  }>;
  actionItems: Array<{
    actionItem: string;
    rationale: string;
  }>;
}

export interface FeedbackData {
  interview_id: string;
  satisfaction: number | null;
  feedback: string | null;
  email: string | null;
}

export interface CallData {
  call_id: string;
  agent_id: string;
  audio_websocket_protocol: string;
  audio_encoding: string;
  sample_rate: number;
  call_status: string;
  end_call_after_silence_ms: number;
  from_number: string;
  to_number: string;
  metadata: Record<string, unknown>;
  retell_llm_dynamic_variables: {
    customer_name: string;
  };
  drop_call_if_machine_detected: boolean;
  opt_out_sensitive_data_storage: boolean;
  start_timestamp: string;
  end_timestamp: string;
  transcript: string;
  transcript_object: {
    role: 'agent' | 'user';
    content: string;
    words: {
      word: string;
      start: number;
      end: number;
    }[];
  }[];
  transcript_with_tool_calls: {
    role: 'agent' | 'user';
    content: string;
    words: {
      word: string;
      start: number;
      end: number;
    }[];
  }[];
  recording_url: string;
  public_log_url: string;
  e2e_latency: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
    max: number;
    min: number;
    num: number;
  };
  llm_latency: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
    max: number;
    min: number;
    num: number;
  };
  llm_websocket_network_rtt_latency: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
    max: number;
    min: number;
    num: number;
  };
  disconnection_reason: string;
  call_analysis: {
    call_summary: string;
    user_sentiment: string;
    agent_sentiment: string;
    agent_task_completion_rating: string;
    agent_task_completion_rating_reason: string;
    call_completion_rating: string;
    call_completion_rating_reason: string;
  };
}

export interface CustomAgentConfig {
  name: string;
  role: string;
  expertise: string[];
  personality: string;
  voiceId: string;

  interviewStyle: InterviewStyle;
  questionPreferences: QuestionPreference[];
  evaluationCriteria: EvaluationCriteria[];

  conversationFlow: ConversationFlow;
  customPrompts?: CustomPrompts;
  tools?: AgentTool[];

  createdBy: string;
  createdAt: Date;
  isActive: boolean;
  tags?: string[];
}

export interface InterviewStyle {
  formality: 'formal' | 'casual' | 'mixed' | 'professional';
  pace: 'slow' | 'moderate' | 'fast';
  approach: 'direct' | 'conversational' | 'analytical';
  feedbackStyle: 'immediate' | 'end_of_question' | 'end_of_session';
}

export interface QuestionPreference {
  type: string;
  weight: number;
  customInstructions?: string;
}

export interface EvaluationCriteria {
  dimension: string;
  weight: number;
  customPrompt?: string;
  minScore?: number;
  maxScore?: number;
}

export interface ConversationFlow {
  introduction: string;
  transitionPhrases: string[];
  followUpStrategy: 'aggressive' | 'moderate' | 'gentle';
  closingPhrases: string[];
  interruptionHandling: string;
}

export interface CustomPrompts {
  systemPrompt?: string;
  evaluationPrompt?: string;
  followUpPrompt?: string;
  feedbackPrompt?: string;
}

export interface AgentTool {
  type: 'function' | 'end_call' | 'evaluate' | 'custom';
  name: string;
  description: string;
  parameters?: Record<string, any>;
  conditions?: string[];
}

export interface CreateCustomAgentRequest {
  config: CustomAgentConfig;
  templateId?: string;
}

export interface CreateCustomAgentResponse {
  agentId: string;
  llmId: string;
  config: CustomAgentConfig;
  retellAgent: any;
}
