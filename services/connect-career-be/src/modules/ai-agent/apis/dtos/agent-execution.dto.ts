import { IsString, IsOptional, IsObject, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AgentExecutionDto {
  @ApiProperty({ description: 'Agent name to execute' })
  @IsString()
  agentName: string;

  @ApiProperty({ description: 'Task description' })
  @IsString()
  task: string;

  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ description: 'Session ID' })
  @IsString()
  @IsOptional()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Intent classification' })
  @IsString()
  @IsOptional()
  intent?: string;

  @ApiPropertyOptional({ description: 'Extracted entities' })
  @IsObject()
  @IsOptional()
  entities?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Conversation history' })
  @IsArray()
  @IsOptional()
  conversationHistory?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;

  @ApiPropertyOptional({ description: 'Additional context' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

