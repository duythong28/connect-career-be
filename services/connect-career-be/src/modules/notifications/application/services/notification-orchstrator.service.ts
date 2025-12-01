import { Injectable, Logger } from "@nestjs/common";
import { NotificationChannel, NotificationEntity, NotificationType } from "../../domain/entities/notification.entity";
import { EventBus } from "@nestjs/cqrs";
import { IDomainEvent } from "src/shared/domain";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserNotificationPreferences } from "../../domain/entities/user-notification-preferences.entity";
import { ProviderFactory } from "../../infrastructure/providers/common/provider.factory";

export interface NotificationConfig { 
    type: NotificationType;
    channels: NotificationChannel[];
    metadata?: Record<string, any>; 
    priority?: 'low' | 'medium' | 'high';
}

@Injectable()
export class NotificationOrchestratorService {
    private readonly logger = new Logger(NotificationOrchestratorService.name);

    constructor(
        @InjectRepository(NotificationEntity)
        private readonly notificationRepository: Repository<NotificationEntity>,
        @InjectRepository(UserNotificationPreferences)
        private readonly userNotificationPreferencesRepository: Repository<UserNotificationPreferences>,
        private readonly providerFactory: ProviderFactory,
        private readonly eventBus: EventBus
    ){}

    async handleDomainEvent(event: IDomainEvent): Promise<void> { 
        try {
            // 1. Map domain event to notification type
            // const notificationConfig = this.
            // 2. Get recipients
            // 3. For each recipient, determine channels and send
        }
        catch (error) {
            this.logger.error(`Error handling domain event: ${event.constructor.name}`, error);
            throw error;
        }
    }

    async sendToRecipent(
        userId: string,
        config: NotificationConfig,
        event: IDomainEvent
    ): Promise<void> {

    }

    async sendViaChannel(
        userId: string,
        channel: NotificationChannel,
        config: NotificationConfig,
        event: IDomainEvent,
        preferences: any
    ): Promise<void> {
        try {
            // 1. Get template
            // 2. Create notification record

        }
        catch (error) {
            this.logger.error(`Error sending notification via channel: ${channel}`, error);
            throw error;
        }
    }

    // private mapEventToNotification(event: IDomainEvent): NotificationConfig | null {
    //     const eventName = event.constructor.name;

    // }

    // private async getRecipients(event: IDomainEvent): Promise<string[]> { 
    // }

    private selectChannels(
        type: NotificationType,
        suggestedChannels: NotificationChannel[],
        preferences: UserNotificationPreferences
    ): NotificationChannel[] {
        const enabledChannels = preferences.preferences[type.toLowerCase()]?.channels || [];
        return [...new Set([...suggestedChannels, ...enabledChannels])];
    }

    private async getRecipientIdentifier(
        userId: string,
        channel: NotificationChannel
    ): Promise<string> { 
        if (
            channel === NotificationChannel.WEBSOCKET || 
            channel === NotificationChannel.PUSH || 
            channel === NotificationChannel.EMAIL ||
            channel == NotificationChannel.SMS
        ) {
            return userId;
        }
        return userId;
    }

    async scheduleNotification(config: {
        userId: string;
        type: NotificationType;
        scheduleAt: Date;
        metadata?: Record<string, any>;
    }): Promise<void> { 

    }
}