import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from 'src/modules/identity/api/guards/jwt-auth.guard';
import * as decorators from 'src/modules/identity/api/decorators';
import { ChatService } from '../../application/chat.service';
import { SuggestionService } from '../../application/suggestion.service';
import { SessionRepository } from '../../domain/repositories/session.repository';
import { MessageRepository } from '../../domain/repositories/message.repository';
import { CreateChatSessionRequestDto } from '../dtos/requests/create-chat-session.request.dto';
import { SearchSessionRequestDto } from '../dtos/requests/search-session.request.dto';
import { UpdateSessionRequestDto } from '../dtos/requests/update-session.request.dto';
import { ChatSessionResponseDto } from '../dtos/responses/chat-session.response.dto';
import { ChatRequestExtendedDto } from '../dtos/requests/chat-request-extended.dto';
import { ChatSessionDetailResponseDto } from '../dtos/responses/chat-session-detail.response.dto';

@ApiTags('Chat')
@Controller('/v1/chat')
@UseGuards(JwtAuthGuard)
export class AiAgentController {
  constructor(
    private readonly chatService: ChatService,
    private readonly suggestionService: SuggestionService,
    private readonly sessionRepository: SessionRepository,
    private readonly messageRepository: MessageRepository,
  ) {}

  // 1. POST /sessions - Create session
  @Post('/sessions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new chat session' })
  @ApiResponse({ status: 201, description: 'Session created successfully' })
  async createSession(
    @Body() sessionData: CreateChatSessionRequestDto,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ): Promise<{
    statusCode: number;
    message: string;
    data: ChatSessionResponseDto;
  }> {
    const session = await this.sessionRepository.create({
      userId: user.sub,
      title: sessionData.title,
      metadata: sessionData.metadata || {},
    });

    return {
      statusCode: 0,
      message: 'Session created successfully',
      data: {
        id: session.id,
        userId: session.userId,
        title: session.title,
        metadata: session.metadata,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
    };
  }

  // 2. POST /sessions/search - List/search sessions
  @Post('/sessions/search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search and list chat sessions' })
  @ApiResponse({ status: 200, description: 'Retrieved sessions successfully' })
  async listSessions(
    @Body() searchRequest: SearchSessionRequestDto,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ): Promise<{
    statusCode: number;
    message: string;
    data: ChatSessionResponseDto[];
  }> {
    const limit = searchRequest.limit || 50;
    const offset = searchRequest.offset || 0;

    let sessions = await this.sessionRepository.findByUserId(
      user.sub,
      limit + offset,
    );

    // Apply search term filter if provided
    if (searchRequest.search_term) {
      const searchTerm = searchRequest.search_term.toLowerCase();
      sessions = sessions.filter(
        (session) =>
          session.title?.toLowerCase().includes(searchTerm) ||
          JSON.stringify(session.metadata || {})
            .toLowerCase()
            .includes(searchTerm),
      );
    }

    // Apply pagination
    const paginatedSessions = sessions.slice(offset, offset + limit);

    const sessionDtos: ChatSessionResponseDto[] = paginatedSessions.map(
      (session) => ({
        id: session.id,
        userId: session.userId,
        title: session.title,
        metadata: session.metadata,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      }),
    );

    return {
      statusCode: 0,
      message: 'Retrieved sessions successfully',
      data: sessionDtos,
    };
  }

  // 3. GET /sessions/:sessionId - Get session detail
  @Get('/sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get session detail with messages' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Retrieved session detail successfully',
  })
  async getSessionDetail(
    @Param('sessionId') sessionId: string,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ): Promise<{
    statusCode: number;
    message: string;
    data: ChatSessionDetailResponseDto;
  }> {
    const session = await this.sessionRepository.findById(sessionId);

    if (!session || session.userId !== user.sub) {
      throw new NotFoundException('Session not found or unauthorized');
    }

    const messages = await this.messageRepository.findBySessionId(sessionId);

    const messageDtos = messages.map((msg) => ({
      id: msg.id,
      content: msg.content,
      role: msg.role,
      metadata: msg.metadata,
      createdAt: msg.createdAt,
    }));

    return {
      statusCode: 0,
      message: 'Retrieved session detail successfully',
      data: {
        id: session.id,
        userId: session.userId,
        title: session.title,
        metadata: session.metadata,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messages: messageDtos,
      },
    };
  }

  // 4. PUT /sessions/:sessionId/share - Share session
  @Put('/sessions/:sessionId/share')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Share a chat session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Session shared successfully' })
  async shareSession(
    @Param('sessionId') sessionId: string,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ): Promise<{ statusCode: number; message: string; data: boolean }> {
    const session = await this.sessionRepository.findById(sessionId);

    if (!session || session.userId !== user.sub) {
      throw new NotFoundException('Session not found or unauthorized');
    }

    await this.sessionRepository.update(sessionId, {
      metadata: {
        ...session.metadata,
        shared: true,
        sharedAt: new Date(),
      },
    });

    return {
      statusCode: 0,
      message: 'Session shared successfully',
      data: true,
    };
  }

  // 5. PUT /sessions/:sessionId - Update session
  @Put('/sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a chat session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Session updated successfully' })
  async updateSession(
    @Body() sessionRequest: UpdateSessionRequestDto,
    @Param('sessionId') sessionId: string,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ): Promise<{ statusCode: number; message: string; data: boolean }> {
    const session = await this.sessionRepository.findById(sessionId);

    if (!session || session.userId !== user.sub) {
      throw new NotFoundException('Session not found or unauthorized');
    }

    await this.sessionRepository.update(sessionId, {
      title:
        sessionRequest.title !== undefined
          ? sessionRequest.title
          : session.title,
      metadata:
        sessionRequest.metadata !== undefined
          ? { ...session.metadata, ...sessionRequest.metadata }
          : session.metadata,
    });

    return {
      statusCode: 0,
      message: 'Session updated successfully',
      data: true,
    };
  }

  @Post('/sessions/:sessionId/stream')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stream chat response (SSE)' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  async streamChat(
    @Body() chatRequest: ChatRequestExtendedDto,
    @Param('sessionId') sessionId: string,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
    @Res() res: Response,
  ): Promise<void> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session || session.userId !== user.sub) {
      throw new NotFoundException('Session not found or unauthorized');
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Content-Encoding', 'identity');
    res.flushHeaders();

    try {
      const stream = this.chatService.processMessageStream(
        user.sub,
        sessionId,
        chatRequest.content || '',
        {
          ...chatRequest.metadata,
          attachments: chatRequest.attachments,
          search_enabled: chatRequest.search_enabled,
          clicked_suggestion_id: chatRequest.clicked_suggestion_id,
          manual_retry_attempts: chatRequest.manual_retry_attempts,
        },
      );

      for await (const event of stream) {
        const responseData = JSON.stringify({
          type: event.type,
          ...event.data,
        });
        res.write(`data: ${responseData}\n\n`);

        if ('flush' in res && typeof res.flush === 'function') {
          (res as Response & { flush: () => void }).flush();
        }
      }

      res.end();
    } catch (error) {
      const errorData = JSON.stringify({
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
      res.write(`data: ${errorData}\n\n`);
      if ('flush' in res && typeof res.flush === 'function') {
        (res as Response & { flush: () => void }).flush();
      }
      res.end();
    }
  }

  @Get('/sessions/:sessionId/messages/:messageId/speech')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get speech audio for a message' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  async getMessageSpeech(
    @Param('sessionId') sessionId: string,
    @Param('messageId') messageId: string,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
    @Res() res: Response,
  ): Promise<void> {
    const session = await this.sessionRepository.findById(sessionId);

    if (!session || session.userId !== user.sub) {
      throw new NotFoundException('Session not found or unauthorized');
    }

    const message = await this.messageRepository.findById(messageId);

    if (!message || message.sessionId !== sessionId) {
      throw new NotFoundException('Message not found');
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=message_${messageId}.mp3`,
    );
    res.setHeader('Cache-Control', 'no-cache');

    res.end();
  }

  @Delete('/sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a chat session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Session deleted successfully' })
  async deleteSession(
    @Param('sessionId') sessionId: string,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ): Promise<{ statusCode: number; message: string; data: boolean }> {
    const session = await this.sessionRepository.findById(sessionId);

    if (!session || session.userId !== user.sub) {
      throw new NotFoundException('Session not found or unauthorized');
    }

    await this.sessionRepository.delete(sessionId);

    return {
      statusCode: 0,
      message: 'Session deleted successfully',
      data: true,
    };
  }

  @Get('/prompt-suggestions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get prompt suggestions' })
  @ApiResponse({ status: 200, description: 'Suggestions fetched successfully' })
  async suggestPrompts(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ): Promise<{
    statusCode: number;
    message: string;
    data: { suggestions: string[] };
  }> {
    const suggestions = await this.suggestionService.getSuggestions(
      user.sub,
      '',
    );

    return {
      statusCode: 0,
      message: 'Suggestions fetched successfully',
      data: {
        suggestions: Array.isArray(suggestions)
          ? suggestions
          : (suggestions as { suggestions: string[] } | undefined)
              ?.suggestions || [],
      },
    };
  }
}
