import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
}

export enum ErrorType {
  DOMAIN_ERROR = 'DOMAIN_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  TIMEOUT = 'TIMEOUT',
  MODEL_FAILURE = 'MODEL_FAILURE',
}

export interface StreamChatResponse {
  messages?: ChatMessage | ChatMessage[];
  isDone: boolean;
  isError: boolean;
  needsRetry?: boolean;
  errorType?: ErrorType | string;
  reachRetryAttemptLimit?: boolean;
  messageId?: string;
  completedAt?: Date;
}
