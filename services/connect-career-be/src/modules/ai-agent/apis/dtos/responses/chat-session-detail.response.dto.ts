import { ApiProperty } from '@nestjs/swagger';
import { ChatSessionResponseDto } from './chat-session.response.dto';

export class ChatSessionDetailResponseDto extends ChatSessionResponseDto {
  @ApiProperty({
    description: 'Messages in the session',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        content: { type: 'string' },
        role: { type: 'string', enum: ['user', 'assistant', 'system'] },
        metadata: { type: 'object' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  messages: Array<{
    id: string;
    content: string;
    role: 'user' | 'assistant' | 'system';
    metadata?: Record<string, any>;
    createdAt: Date;
  }>;
}
