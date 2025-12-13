import { BaseMessage } from '@langchain/core/messages';

export type UserRole = 'candidate' | 'recruiter';

export interface AgentState {
  messages: BaseMessage[];
  role?: UserRole;
  intent?: string;
  triage_message?: any;
  promotions?: any;
  products?: any[];
  orders?: any;
  faqs?: any[];
  thread_id: string;
  user_profile?: any;
  hallucination_retry?: boolean;
  analysis_result?: any;
  context_data?: Record<string, any>;
}

