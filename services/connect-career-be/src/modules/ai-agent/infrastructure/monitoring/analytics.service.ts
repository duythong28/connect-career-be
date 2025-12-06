import { Injectable, Logger } from '@nestjs/common';

export interface AnalyticsEvent {
  type: string;
  userId?: string;
  sessionId?: string;
  agentName?: string;
  intent?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly events: AnalyticsEvent[] = [];

  trackEvent(event: Omit<AnalyticsEvent, 'timestamp'>): void {
    const fullEvent: AnalyticsEvent = {
      ...event,
      timestamp: new Date(),
    };

    this.events.push(fullEvent);
    this.logger.debug(`Analytics event tracked: ${event.type}`);

    // In production, send to analytics service (e.g., Mixpanel, Amplitude)
  }

  getEvents(filters?: {
    type?: string;
    userId?: string;
    agentName?: string;
    startDate?: Date;
    endDate?: Date;
  }): AnalyticsEvent[] {
    return this.events.filter((event) => {
      if (filters?.type && event.type !== filters.type) return false;
      if (filters?.userId && event.userId !== filters.userId) return false;
      if (filters?.agentName && event.agentName !== filters.agentName)
        return false;
      if (filters?.startDate && event.timestamp < filters.startDate)
        return false;
      if (filters?.endDate && event.timestamp > filters.endDate) return false;
      return true;
    });
  }
}
