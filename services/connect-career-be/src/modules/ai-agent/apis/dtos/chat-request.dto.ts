import { IsString, IsOptional, IsObject, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatRequestDto {
  @ApiProperty({ description: 'User message content' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'User ID' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: 'Session ID for conversation tracking' })
  @IsString()
  @IsOptional()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Conversation history' })
  @IsArray()
  @IsOptional()
  conversationHistory?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;

  @ApiPropertyOptional({ description: 'Additional context metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
