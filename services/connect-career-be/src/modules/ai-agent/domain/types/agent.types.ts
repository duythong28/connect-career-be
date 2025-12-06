export interface AgentContext {
  userId: string;
  sessionId: string;
  task: string;
  intent?: string;
  entities?: Record<string, any>;
  conversationHistory?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  memory?: {
    episodic?: any;
    semantic?: any;
    procedural?: any;
  };
  metadata?: Record<string, any>;
}

export interface AgentResult {
  success: boolean;
  data?: any;
  explanation?: string;
  nextSteps?: string[];
  errors?: Error[];
  metadata?: Record<string, any>;
  agentName?: string;
  executionTime?: number;
}

export interface IntentResult {
  intent: string;
  entities: Record<string, any>;
  confidence: number;
  requiresClarification: boolean;
  alternativeIntents?: Array<{ intent: string; confidence: number }>;
}

export interface WorkflowState {
  currentStep: number;
  totalSteps: number;
  completedTasks: string[];
  pendingTasks: string[];
  results: Record<string, any>;
}

export interface Task {
  id: string;
  type: string;
  agent: string;
  parameters: Record<string, any>;
  dependencies?: string[];
  status?: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface WorkflowResult {
  success: boolean;
  results: Record<string, AgentResult>;
  finalOutput: any;
  errors?: Error[];
}

