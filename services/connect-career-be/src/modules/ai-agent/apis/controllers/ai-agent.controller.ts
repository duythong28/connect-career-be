import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from 'src/modules/identity/api/guards/jwt-auth.guard';
import * as decorators from 'src/modules/identity/api/decorators';
import { ChatService } from '../../application/chat.service';
import { AiAgentService } from '../../application/ai-agent.service';
import { SuggestionService } from '../../application/suggestion.service';
import { MediaService } from '../../application/media.service';
import { ChatRequestDto } from '../dtos/chat-request.dto';
import { ChatResponseDto } from '../dtos/chat-response.dto';
import { AgentExecutionDto } from '../dtos/agent-execution.dto';
import { MediaUploadDto } from '../dtos/media-upload.dto';
import { AgentExecutionException } from '../http-exceptions/agent-execution.exception';
import { IntentDetectionException } from '../http-exceptions/intent-detection.exception';

@ApiTags('AI Agent')
@Controller('/v1/ai-agent')
@UseGuards(JwtAuthGuard)
export class AiAgentController {
  constructor(
    private readonly chatService: ChatService,
    private readonly aiAgentService: AiAgentService,
    private readonly suggestionService: SuggestionService,
    private readonly mediaService: MediaService,
  ) {}

  @Post('chats')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new AI chat session' })
  async createChat(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return await this.chatService.createChat(user.sub);
  }

  @Post('chats/:sessionId/messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a chat message to AI agent' })
  async sendMessage(
    @Param('sessionId') sessionId: string,
    @Body() dto: ChatRequestDto,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ): Promise<ChatResponseDto> {
    try {
      return await this.chatService.processMessage(
        user.sub,
        sessionId,
        dto.message,
        dto.metadata,
      );
    } catch (error) {
      if (error instanceof IntentDetectionException) throw error;
      throw new AgentExecutionException(
        'Failed to process chat message',
        undefined,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  @Post('chats/:sessionId/execute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually execute a specific agent' })
  async executeAgent(
    @Param('sessionId') sessionId: string,
    @Body() dto: AgentExecutionDto,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    try {
      return await this.aiAgentService.executeAgent(dto.agentName, {
        userId: user.sub,
        sessionId,
        task: dto.task,
        intent: dto.intent,
        entities: dto.entities,
        metadata: dto.metadata,
      });
    } catch (error) {
      throw new AgentExecutionException(
        'Failed to execute agent',
        dto.agentName,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  @Get('chats/:sessionId/suggestions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get contextual suggestion questions' })
  async getSuggestions(
    @Param('sessionId') sessionId: string,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return await this.suggestionService.getSuggestions(user.sub, sessionId);
  }

  @Post('chats/:sessionId/media')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload media for AI processing' })
  async uploadMedia(
    @Param('sessionId') sessionId: string,
    @Body() dto: MediaUploadDto,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return await this.mediaService.processMedia(
      dto.content,
      dto.type,
      dto.fileName,
      {
        userId: user.sub,
        sessionId,
        metadata: dto.metadata,
      },
    );
  }

  @Get('chats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all chat sessions for the current user' })
  @ApiResponse({ status: 200, description: 'List of chat sessions' })
  async getChatSessions(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
    @Query('limit') limit?: string,
  ) {
    return await this.chatService.getUserChatSessions(
      user.sub,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get('chats/:sessionId/history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get conversation history for a specific session' })
  @ApiResponse({ status: 200, description: 'Conversation history' })
  async getConversationHistory(
    @Param('sessionId') sessionId: string,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return await this.chatService.getConversationHistory(user.sub, sessionId);
  }

  @Get('chats/recent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get recent conversations across all sessions' })
  @ApiResponse({ status: 200, description: 'Recent conversations' })
  async getRecentConversations(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
    @Query('limit') limit?: string,
  ) {
    return await this.chatService.getRecentConversations(
      user.sub,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Post('chats/:sessionId/messages/stream')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a chat message with streaming response (SSE)' })
  async sendMessageStream(
    @Param('sessionId') sessionId: string,
    @Body() dto: ChatRequestDto,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
    @Res() res: Response,
  ): Promise<void> {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    // Flush headers immediately
    res.flushHeaders();

    try {
      const stream = this.chatService.processMessageStream(
        user.sub,
        sessionId,
        dto.message,
        dto.metadata,
      );

      for await (const event of stream) {
        const data = JSON.stringify({ type: event.type, ...event.data });
        res.write(`data: ${data}\n\n`);
        
        // Flush after each write to ensure immediate sending
        if (typeof (res as any).flush === 'function') {
          (res as any).flush();
        }
      }

      res.end();
    } catch (error) {
      const errorData = JSON.stringify({
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
      res.write(`data: ${errorData}\n\n`);
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
      res.end();
    }
  }
}
