import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatResponseDto {
  @ApiProperty({ description: 'Assistant response message' })
  message: string;

  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiPropertyOptional({ description: 'Detected intent' })
  intent?: string;

  @ApiPropertyOptional({ description: 'Extracted entities' })
  entities?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Suggested next actions' })
  suggestions?: string[];

  @ApiPropertyOptional({ description: 'Agent that handled the request' })
  agent?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, any>;
}

