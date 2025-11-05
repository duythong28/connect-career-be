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
interface LLMCreateParams {
  model?: LLMModel;
  general_prompt?: string;
  general_tools?: Array<{
    type: 'end_call' | 'function' | 'transfer_call';
    name: string;
    description: string;
    function_description?: string;
    parameters?: Record<string, any>;
  }>;
  start_speaker?: 'agent' | 'user';
  enable_transcription?: boolean;
  transcriber?: {
    provider?: 'deepgram' | 'assembly_ai' | 'gladia';
    model?: string;
    language?: string;
  };
  response_delay_ms?: number;
  enable_backchannel?: boolean;
  language?: string;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;

  base_url?: string;
  api_key?: string;
  model_name?: string;
}

interface AgentCreateParams {
  response_engine: {
    type: 'retell-llm' | 'custom_llm' | 'conversational_ai';
    llm_id?: string; // Required for retell-llm
    custom_llm_url?: string; // For custom_llm type
    conversational_ai_config?: any; // For conversational_ai type
  };
  voice: {
    provider?: '11labs' | 'playht' | 'deepgram' | 'eleven_labs';
    voice_id?: string; // e.g., '11labs-Chloe', 'deepgram-Aurora'
    speed?: number; // 0.5 to 2.0
    stability?: number; // 0-1 (for some providers)
    similarity_boost?: number; // 0-1 (for some providers)
    model?: string; // Voice model version
  };
  agent_name: string;
  language?: string;

  // Real-time settings
  real_time_websocket_protocol?: 'webSocket';
  real_time_websocket_encoding?:
    | 'linear16'
    | 's16le'
    | 'mulaw'
    | 'alaw'
    | 'g711ulaw'
    | 'g711alaw';
  real_time_websocket_sample_rate?: 8000 | 16000 | 24000 | 44100 | 48000;

  // Call settings
  end_call_after_silence_ms?: number; // Auto-end call after silence
  enable_voicemail_detection?: boolean;

  // Webhooks
  webhook_url?: string;
  webhook_events?: string[]; // ['call_started', 'call_ended', 'function_call', etc.]

  // Custom data
  metadata?: Record<string, any>;

  // Conversation settings
  enable_backchannel?: boolean;
  interruption_sensitivity?: 'low' | 'medium' | 'high';

  // Cost optimization
  reduce_latency?: boolean;
  enable_webhook_audio?: boolean;
}

interface CustomLLMConfig {
  model: 'custom'; // Special identifier
  custom_llm_url: string; // Your LLM endpoint
  api_key?: string; // If required
  model_name?: string;

  // Request format
  request_format?: {
    method?: 'POST';
    headers?: Record<string, string>;
    body?: {
      messages?: string; // Path to messages in request
      stream?: string; // Path to stream flag
      model?: string; // Path to model name
    };
  };

  // Response format
  response_format?: {
    messages?: string; // Path to messages in response
    content?: string; // Path to content in response
    finish_reason?: string; // Path to finish reason
  };
}

enum LLMModel {
  GPT_5 = 'gpt-5',
  GPT_5_MINI = 'gpt-5-mini',
  GPT_5_NANO = 'gpt-5-nano',
  GPT_4_1 = 'gpt-4.1',
  GPT_4_1_MINI = 'gpt-4.1-mini',
  GPT_4_1_NANO = 'gpt-4.1-nano',
  GPT_4O = 'gpt-4o',
  GPT_4O_MINI = 'gpt-4o-mini',
  CLAUDE_3_7_SONNET = 'claude-3.7-sonnet',
  CLAUDE_3_5_HAIKU = 'claude-3.5-haiku',
  GEMINI_2_0_FLASH = 'gemini-2.0-flash',
  GEMINI_2_0_FLASH_LITE = 'gemini-2.0-flash-lite',
  GEMINI_2_5_FLASH = 'gemini-2.5-flash',
  GEMINI_2_5_FLASH_LITE = 'gemini-2.5-flash-lite',
}
