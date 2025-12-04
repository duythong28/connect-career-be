export interface AgentContext {
  userId: string;
  sessionId: string;
  task: string;
  intent?: string;
  entities?: Record<string, any>;
  conversationHistory?: any[];
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
}
