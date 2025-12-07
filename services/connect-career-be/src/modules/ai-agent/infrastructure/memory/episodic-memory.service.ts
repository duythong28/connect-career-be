import { Injectable, Logger } from '@nestjs/common';
import { EpisodicMemory } from '../../domain/interfaces/memory.interface';
import { ConversationRepository } from '../../domain/repositories/conversation.repository';
import { EventType } from '../../domain/enums/event-type.enum';

@Injectable()
export class EpisodicMemoryService implements EpisodicMemory {
  private readonly logger = new Logger(EpisodicMemoryService.name);

  constructor(
    private readonly conversationRepository: ConversationRepository,
  ) {}

  /**
   * Store a generic key-value pair (from IMemory interface)
   * Maps to storing a conversation event
   */
  async store(
    key: string,
    value: any,
    metadata?: Record<string, any>,
  ): Promise<void> {
    // If value has event structure, use storeEvent
    if (value && typeof value === 'object' && (value.sessionId || value.type)) {
      await this.storeEvent(key, value, metadata?.timestamp);
      return;
    }

    // Otherwise, store as a generic conversation entry
    await this.conversationRepository.create({
      userId: key,
      sessionId: metadata?.sessionId || `session_${Date.now()}`,
      message: typeof value === 'string' ? value : JSON.stringify(value),
      role: 'system',
      metadata: {
        ...metadata,
        storedValue: value,
      },
    });
  }

  /**
   * Retrieve the most recent event for a user (from IMemory interface)
   */
  async retrieve(key: string): Promise<any | null> {
    const conversations = await this.conversationRepository.findByUserId(key, 1);
    
    if (conversations.length === 0) {
      return null;
    }

    const latest = conversations[0];
    return {
      type: latest.role === 'user' ? EventType.USER_MESSAGE : 
            latest.role === 'assistant' ? EventType.ASSISTANT_MESSAGE : EventType.SYSTEM_MESSAGE,
      sessionId: latest.sessionId,
      content: latest.message,
      timestamp: latest.createdAt,
      metadata: latest.metadata,
    };
  }

  /**
   * Search across all conversations (from IMemory interface)
   * Simple text-based search - in production, use vector search
   */
  async search(
    query: string,
    limit: number = 10,
  ): Promise<Array<{ key: string; value: any; score: number }>> {
    const queryLower = query.toLowerCase();
    const results: Array<{ key: string; value: any; score: number }> = [];

    // Get all conversations (with a reasonable limit for search)
    const allConversations = await this.conversationRepository.findByUserId('', 1000);
    
    // Group by userId for search
    const userConversations = new Map<string, typeof allConversations>();
    for (const conv of allConversations) {
      if (!userConversations.has(conv.userId)) {
        userConversations.set(conv.userId, []);
      }
      userConversations.get(conv.userId)!.push(conv);
    }

    // Search across all users' conversations
    for (const [userId, conversations] of userConversations.entries()) {
      for (const conv of conversations) {
        const messageLower = conv.message.toLowerCase();
        const metadataStr = JSON.stringify(conv.metadata || {}).toLowerCase();
        
        // Simple scoring: exact match = 1.0, partial match = 0.8
        let score = 0;
        if (messageLower.includes(queryLower)) {
          score = messageLower === queryLower ? 1.0 : 0.8;
        } else if (metadataStr.includes(queryLower)) {
          score = 0.6;
        }

        if (score > 0) {
          results.push({
            key: userId,
            value: {
              type: conv.role === 'user' ? EventType.USER_MESSAGE : 
                    conv.role === 'assistant' ? EventType.ASSISTANT_MESSAGE : EventType.SYSTEM_MESSAGE,
              sessionId: conv.sessionId,
              content: conv.message,
              timestamp: conv.createdAt,
              metadata: conv.metadata,
            },
            score,
          });
        }
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Delete all events for a user (from IMemory interface)
   */
  async delete(key: string): Promise<void> {
    // Note: ConversationRepository doesn't have deleteByUserId, so we'd need to add it
    // For now, this is a placeholder - you may want to implement soft delete
    this.logger.warn(`Delete operation requested for userId: ${key}. Not fully implemented.`);
    // TODO: Implement deleteByUserId in ConversationRepository if needed
  }

  /**
   * Store a conversation event (EpisodicMemory specific)
   */
  async storeEvent(
    userId: string,
    event: any,
    timestamp?: Date,
  ): Promise<void> {
    try {
      // Handle different event formats
      const sessionId = event.sessionId || event.metadata?.sessionId || `session_${Date.now()}`;
      const message = event.content || event.message || JSON.stringify(event);
      const role = event.type === EventType.USER_MESSAGE ? 'user' :
                   event.type === EventType.ASSISTANT_MESSAGE ? 'assistant' :
                   event.type === EventType.SYSTEM_MESSAGE ? 'system' : 'user';

      await this.conversationRepository.create({
        userId,
        sessionId,
        message,
        role,
        intent: event.intent,
        entities: event.entities,
        agentName: event.agentName,
        metadata: {
          ...event,
          originalEvent: event,
        },
        createdAt: timestamp || new Date(),
      });
    } catch (error) {
      this.logger.error(
        `Failed to store episodic event: ${error}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Retrieve events for a user (EpisodicMemory specific)
   */
  async retrieveEvents(
    userId: string,
    timeRange?: { start: Date; end: Date },
  ): Promise<any[]> {
    try {
      // Get all conversations for user (with reasonable limit)
      const conversations = await this.conversationRepository.findByUserId(userId, 1000);

      // Filter by time range if provided
      let filtered = conversations;
      if (timeRange) {
        filtered = conversations.filter(
          (c) => c.createdAt >= timeRange.start && c.createdAt <= timeRange.end,
        );
      }

      // Map to event format
      return filtered.map((c) => ({
        type: c.role === 'user' ? EventType.USER_MESSAGE :
              c.role === 'assistant' ? EventType.ASSISTANT_MESSAGE :
              EventType.SYSTEM_MESSAGE,
        sessionId: c.sessionId,
        content: c.message,
        message: c.message, // Support both content and message for compatibility
        timestamp: c.createdAt,
        intent: c.intent,
        entities: c.entities,
        agentName: c.agentName,
        metadata: c.metadata,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to retrieve episodic events: ${error}`,
        error instanceof Error ? error.stack : undefined,
      );
      return [];
    }
  }
}