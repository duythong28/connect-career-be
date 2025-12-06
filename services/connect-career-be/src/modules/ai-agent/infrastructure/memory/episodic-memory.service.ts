import { Injectable, Logger } from '@nestjs/common';
import { EpisodicMemory } from '../../domain/interfaces/memory.interface';

interface Event {
  userId: string;
  event: any;
  timestamp: Date;
  metadata?: Record<string, any>;
}

@Injectable()
export class EpisodicMemoryService implements EpisodicMemory {
  private readonly logger = new Logger(EpisodicMemoryService.name);
  private readonly events = new Map<string, Event[]>();

  async store(key: string, value: any, metadata?: Record<string, any>): Promise<void> {
    // Store episodic memory entry
    const events = this.events.get(key) || [];
    events.push({
      userId: key,
      event: value,
      timestamp: new Date(),
      metadata,
    });
    this.events.set(key, events);
  }

  async retrieve(key: string): Promise<any | null> {
    const events = this.events.get(key);
    return events && events.length > 0 ? events[events.length - 1] : null;
  }

  async search(query: string, limit: number = 10): Promise<Array<{ key: string; value: any; score: number }>> {
    // Simple text-based search (in production, use vector search)
    const results: Array<{ key: string; value: any; score: number }> = [];
    const queryLower = query.toLowerCase();

    for (const [userId, events] of this.events.entries()) {
      for (const event of events) {
        const eventStr = JSON.stringify(event.event).toLowerCase();
        if (eventStr.includes(queryLower)) {
          results.push({
            key: userId,
            value: event,
            score: 0.8, // Simple matching score
          });
        }
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  async delete(key: string): Promise<void> {
    this.events.delete(key);
  }

  async storeEvent(userId: string, event: any, timestamp?: Date): Promise<void> {
    const events = this.events.get(userId) || [];
    events.push({
      userId,
      event,
      timestamp: timestamp || new Date(),
    });
    this.events.set(userId, events);
  }

  async retrieveEvents(
    userId: string,
    timeRange?: { start: Date; end: Date },
  ): Promise<any[]> {
    const events = this.events.get(userId) || [];
    
    if (timeRange) {
      return events
        .filter(
          e =>
            e.timestamp >= timeRange.start && e.timestamp <= timeRange.end,
        )
        .map(e => e.event);
    }

    return events.map(e => e.event);
  }
}

