Reviewing the current system to understand the architecture and existing notification infrastructure.

[16 tools called]

Reviewing a few more files to understand the complete architecture:

[4 tools called]

Drafting a notification system design document with use cases and a technical solution.

[3 tools called]

## Notification System Design Document

### 1. Use Cases by Notification Type

#### A. In-App Realtime Notifications (WebSocket)

**Candidate Use Cases:**

1. Application status updates (e.g., "Your application for Software Engineer has been shortlisted")
2. Interview scheduled/rescheduled/cancelled
3. New message from recruiter
4. Offer received/updated
5. Job recommendations (new matching jobs)
6. Profile view notifications
7. Application deadline reminders
8. Interview reminders (1 hour before)
9. CV feedback received
10. Organization review response

**Recruiter Use Cases:**

1. New application received
2. Application status change (candidate action)
3. Interview reminder (upcoming interviews)
4. Candidate message received
5. Offer response (accepted/rejected/negotiating)
6. Task assignment notifications
7. Team member mentions (@mentions)
8. Application deadline approaching
9. Candidate profile update
10. Pipeline stage change alerts

#### B. Push Notifications (Mobile/Web)

**Candidate Use Cases:**

1. Application status changes (when app is closed)
2. Interview scheduled (with calendar link)
3. New job matches
4. Offer received
5. Important messages from recruiters
6. Profile completion reminders
7. Application deadline warnings

**Recruiter Use Cases:**

1. New high-priority application
2. Interview starting soon (15 min before)
3. Candidate response to offer
4. Urgent task assignments
5. Application deadline alerts
6. Team activity updates

#### C. Email Notifications

**Candidate Use Cases:**

1. Welcome email with verification
2. Application confirmation
3. Application status change (detailed)
4. Interview invitation (with calendar ICS)
5. Interview reminder (24h, 1h before)
6. Offer letter (PDF attachment)
7. Weekly job digest
8. Profile completion reminder
9. Password reset
10. Account security alerts

**Recruiter Use Cases:**

1. Daily/weekly application summary
2. Interview schedule digest
3. Candidate communication summary
4. Pipeline analytics report
5. Team activity report
6. Subscription/billing notifications
7. System maintenance alerts

#### D. SMS Notifications

**Candidate Use Cases:**

1. Interview reminder (2 hours before) - if no email opened
2. Urgent offer response deadline
3. Application deadline (24h before)
4. Two-factor authentication codes
5. Critical status changes (if email fails)

**Recruiter Use Cases:**

1. Urgent interview cancellation
2. High-priority application alert
3. Critical offer response deadline
4. System outage alerts

---

### 2. Technical Solution Design

### 2.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Domain Events Layer                      │
│  (ApplicationStatusChanged, InterviewScheduled, etc.)      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Notification Service Layer                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │     Notification Orchestrator Service                 │  │
│  │  - Event → Notification Mapping                       │  │
│  │  - Channel Selection (based on preferences/rules)    │  │
│  │  - Template Resolution                                │  │
│  │  - Multi-channel Dispatch                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                       │                                      │
│  ┌────────────────────┼────────────────────┐               │
│  │                    │                    │               │
│  ▼                    ▼                    ▼               │
│ ┌──────────┐  ┌──────────────┐  ┌──────────────────┐      │
│ │ In-App   │  │ Push Notif    │  │ Email/SMS Queue  │      │
│ │ Gateway  │  │ Service       │  │ Processor        │      │
│ └──────────┘  └──────────────┘  └──────────────────┘      │
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Notification Providers                         │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                  │
│  │WS    │  │FCM   │  │SMTP  │  │SMS   │                  │
│  │      │  │APNS  │  │      │  │      │                  │
│  └──────┘  └──────┘  └──────┘  └──────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Enhanced Database Schema

```typescript
// Enhanced Notification Entity
@Entity('notifications')
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string; // Recipient user ID

  @Column()
  title: string;

  @Column('text')
  message: string;

  @Column('text', { nullable: true })
  htmlContent: string; // For email templates

  @Column({
    type: 'enum',
    enum: NotificationChannel,
  })
  channel: NotificationChannel;

  @Column({
    type: 'enum',
    enum: NotificationType, // NEW: application, interview, offer, message, etc.
  })
  type: NotificationType;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>; // Entity IDs, links, action buttons

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date | null;

  @Column('jsonb', { nullable: true })
  deliveryMetadata: Record<string, any>; // Provider response, errors

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Indexes
  @Index(['userId', 'status'])
  @Index(['userId', 'createdAt'])
  @Index(['type', 'status'])
}

// NEW: User Notification Preferences
@Entity('user_notification_preferences')
export class UserNotificationPreferencesEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { unique: true })
  userId: string;

  @Column('jsonb')
  preferences: {
    email: {
      enabled: boolean;
      types: string[]; // Which notification types via email
      frequency: 'realtime' | 'digest' | 'daily' | 'weekly';
    };
    push: {
      enabled: boolean;
      types: string[];
      quietHours: { start: string; end: string } | null;
    };
    sms: {
      enabled: boolean;
      types: string[]; // Only critical types
      phoneNumber: string | null;
    };
    inApp: {
      enabled: boolean;
      markAsRead: boolean;
    };
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// NEW: Push Notification Tokens
@Entity('push_notification_tokens')
export class PushNotificationTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column()
  token: string; // FCM/APNS token

  @Column({
    type: 'enum',
    enum: ['fcm', 'apns', 'web'],
  })
  platform: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Index(['userId', 'isActive'])
}
```

### 2.3 Enhanced Notification Channel Enum

```typescript
export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  WEBSOCKET = 'websocket',
  PUSH = 'push', // NEW
}

export enum NotificationType {
  // Application related
  APPLICATION_RECEIVED = 'application_received',
  APPLICATION_STATUS_CHANGED = 'application_status_changed',
  APPLICATION_DEADLINE_REMINDER = 'application_deadline_reminder',

  // Interview related
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  INTERVIEW_REMINDER = 'interview_reminder',
  INTERVIEW_CANCELLED = 'interview_cancelled',
  INTERVIEW_RESCHEDULED = 'interview_rescheduled',

  // Offer related
  OFFER_SENT = 'offer_sent',
  OFFER_ACCEPTED = 'offer_accepted',
  OFFER_REJECTED = 'offer_rejected',

  // Communication
  NEW_MESSAGE = 'new_message',
  MENTION = 'mention',

  // Job related
  JOB_RECOMMENDATION = 'job_recommendation',
  JOB_DEADLINE_APPROACHING = 'job_deadline_approaching',

  // Profile related
  PROFILE_VIEWED = 'profile_viewed',
  CV_FEEDBACK = 'cv_feedback',

  // System
  USER_REGISTERED = 'user_registered',
  PASSWORD_RESET = 'password_reset',
  EMAIL_VERIFIED = 'email_verified',
}
```

### 2.4 Notification Orchestrator Service

```typescript
@Injectable()
export class NotificationOrchestratorService {
  constructor(
    private readonly notificationRepository: INotificationRepository,
    private readonly userPreferencesService: UserPreferencesService,
    private readonly providerFactory: ProviderFactory,
    private readonly templateService: NotificationTemplateService,
    private readonly eventBus: EventBus,
  ) {}

  async handleDomainEvent(event: IDomainEvent): Promise<void> {
    // 1. Map domain event to notification type
    const notificationConfig = this.mapEventToNotification(event);

    // 2. Get recipients
    const recipients = await this.getRecipients(event);

    // 3. For each recipient, determine channels and send
    for (const recipient of recipients) {
      await this.sendToRecipient(recipient, notificationConfig, event);
    }
  }

  private async sendToRecipient(
    userId: string,
    config: NotificationConfig,
    event: IDomainEvent,
  ): Promise<void> {
    const preferences =
      await this.userPreferencesService.getPreferences(userId);

    // Determine which channels to use based on preferences and notification type
    const channels = this.selectChannels(config.type, preferences);

    // Create notification records and send via each channel
    const promises = channels.map((channel) =>
      this.sendViaChannel(userId, channel, config, event, preferences),
    );

    await Promise.allSettled(promises);
  }

  private async sendViaChannel(
    userId: string,
    channel: NotificationChannel,
    config: NotificationConfig,
    event: IDomainEvent,
    preferences: UserPreferences,
  ): Promise<void> {
    // 1. Get template
    const template = await this.templateService.getTemplate(
      config.type,
      channel,
      event,
    );

    // 2. Create notification record
    const notification = await this.notificationRepository.create({
      userId,
      title: template.title,
      message: template.message,
      htmlContent: template.htmlContent,
      channel,
      type: config.type,
      metadata: config.metadata,
      status: NotificationStatus.PENDING,
    });

    // 3. Send via provider
    try {
      const provider = this.providerFactory.createProvider(channel);
      await provider.send({
        recipient: await this.getRecipientIdentifier(userId, channel),
        title: template.title,
        message: template.message,
        htmlContent: template.htmlContent,
        metadata: config.metadata,
      });

      // 4. Update status
      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();
    } catch (error) {
      notification.status = NotificationStatus.FAILED;
      notification.deliveryMetadata = { error: error.message };
    } finally {
      await this.notificationRepository.save(notification);
    }
  }
}
```

### 2.5 Enhanced WebSocket Gateway

```typescript
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/notifications',
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, Set<string>>(); // userId -> Set of socketIds

  handleConnection(client: Socket) {
    const userId = this.extractUserId(client);
    if (!userId) {
      client.disconnect();
      return;
    }

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);

    // Send unread notifications count
    this.sendUnreadCount(client, userId);
  }

  handleDisconnect(client: Socket) {
    const userId = this.extractUserId(client);
    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId)!.delete(client.id);
      if (this.userSockets.get(userId)!.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  async sendToUser(
    userId: string,
    notification: NotificationEntity,
  ): Promise<void> {
    const sockets = this.userSockets.get(userId);
    if (!sockets || sockets.size === 0) {
      return; // User not connected
    }

    const payload = {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      metadata: notification.metadata,
      createdAt: notification.createdAt,
    };

    sockets.forEach((socketId) => {
      this.server.to(socketId).emit('notification', payload);
    });
  }

  @SubscribeMessage('mark-read')
  async handleMarkAsRead(client: Socket, notificationId: string) {
    // Update notification as read
    // Emit updated unread count
  }
}
```

### 2.6 Push Notification Provider

```typescript
@Injectable()
export class PushNotificationProvider implements INotificationProvider {
  constructor(
    private readonly fcmService: FCMService,
    private readonly apnsService: APNSService,
    private readonly tokenRepository: IPushTokenRepository,
  ) {}

  async send(payload: NotificationPayload): Promise<void> {
    const userId = payload.userId;
    const tokens = await this.tokenRepository.getActiveTokens(userId);

    if (tokens.length === 0) {
      return;
    }

    const promises = tokens.map((token) => {
      if (token.platform === 'fcm' || token.platform === 'web') {
        return this.fcmService.send({
          token: token.token,
          title: payload.title,
          body: payload.message,
          data: payload.metadata,
          clickAction: payload.metadata?.actionUrl,
        });
      } else if (token.platform === 'apns') {
        return this.apnsService.send({
          token: token.token,
          alert: {
            title: payload.title,
            body: payload.message,
          },
          sound: 'default',
          badge: await this.getUnreadCount(userId),
          data: payload.metadata,
        });
      }
    });

    await Promise.allSettled(promises);
  }
}
```

### 2.7 Event Handlers

```typescript
// Application Status Changed Handler
@EventsHandler(ApplicationStatusChangedEvent)
export class ApplicationStatusChangedHandler
  implements IEventHandler<ApplicationStatusChangedEvent>
{
  constructor(private readonly orchestrator: NotificationOrchestratorService) {}

  async handle(event: ApplicationStatusChangedEvent) {
    await this.orchestrator.handleDomainEvent(event);
  }
}

// Interview Scheduled Handler
@EventsHandler(InterviewScheduledEvent)
export class InterviewScheduledHandler
  implements IEventHandler<InterviewScheduledEvent>
{
  constructor(private readonly orchestrator: NotificationOrchestratorService) {}

  async handle(event: InterviewScheduledEvent) {
    // Send immediate notification
    await this.orchestrator.handleDomainEvent(event);

    // Schedule reminder notifications
    await this.scheduleReminders(event);
  }

  private async scheduleReminders(event: InterviewScheduledEvent) {
    const interviewDate = new Date(event.scheduledDate);

    // 24 hours before
    const reminder24h = new Date(interviewDate.getTime() - 24 * 60 * 60 * 1000);
    await this.orchestrator.scheduleNotification({
      userId: event.candidateId,
      type: NotificationType.INTERVIEW_REMINDER,
      scheduledAt: reminder24h,
      metadata: { interviewId: event.interviewId },
    });

    // 1 hour before
    const reminder1h = new Date(interviewDate.getTime() - 60 * 60 * 1000);
    await this.orchestrator.scheduleNotification({
      userId: event.candidateId,
      type: NotificationType.INTERVIEW_REMINDER,
      scheduledAt: reminder1h,
      metadata: { interviewId: event.interviewId },
    });
  }
}
```

### 2.8 Template Service

```typescript
@Injectable()
export class NotificationTemplateService {
  async getTemplate(
    type: NotificationType,
    channel: NotificationChannel,
    event: IDomainEvent,
  ): Promise<NotificationTemplate> {
    // Load template based on type and channel
    // Support multiple languages
    // Inject event data into template

    const template = await this.loadTemplate(type, channel);
    return {
      title: this.interpolate(template.title, event),
      message: this.interpolate(template.message, event),
      htmlContent:
        channel === NotificationChannel.EMAIL
          ? await this.renderEmailTemplate(template, event)
          : null,
    };
  }
}
```

### 2.9 Scheduled Notification Processor

```typescript
@Injectable()
export class ScheduledNotificationProcessor {
  @Cron('*/1 * * * *') // Every minute
  async processScheduledNotifications() {
    const dueNotifications = await this.notificationRepository.findDue(
      new Date(),
    );

    for (const notification of dueNotifications) {
      await this.orchestrator.sendNotification(notification);
    }
  }
}
```

### 2.10 API Endpoints

```typescript
@Controller('v1/notifications')
export class NotificationController {
  // Get user notifications
  @Get()
  async getNotifications(
    @User() user: User,
    @Query() query: GetNotificationsQueryDto,
  ) {
    return this.service.getUserNotifications(user.id, query);
  }

  // Mark as read
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @User() user: User) {
    return this.service.markAsRead(id, user.id);
  }

  // Mark all as read
  @Patch('read-all')
  async markAllAsRead(@User() user: User) {
    return this.service.markAllAsRead(user.id);
  }

  // Get unread count
  @Get('unread-count')
  async getUnreadCount(@User() user: User) {
    return this.service.getUnreadCount(user.id);
  }

  // Update preferences
  @Put('preferences')
  async updatePreferences(
    @User() user: User,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.service.updatePreferences(user.id, dto);
  }

  // Register push token
  @Post('push-token')
  async registerPushToken(
    @User() user: User,
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.service.registerPushToken(user.id, dto);
  }
}
```

---

### 3. Implementation Recommendations

1. Use a message queue (Redis/BullMQ) for reliable delivery and retries
2. Add rate limiting per user/channel
3. Implement batching for digest emails
4. Add notification grouping (e.g., "5 new applications")
5. Support i18n for templates
6. Add analytics (delivery rates, open rates, click rates)
7. Implement A/B testing for templates
8. Add webhook support for external integrations
9. Implement dead letter queue for failed notifications
10. Add notification preferences UI

---

### 4. Technology Stack Recommendations

- WebSocket: Socket.IO (already in use pattern)
- Push: Firebase Cloud Messaging (FCM) for Android/Web, Apple Push Notification Service (APNS) for iOS
- Email: Nodemailer (already in use) + React Email for templates
- SMS: Twilio or AWS SNS
- Queue: BullMQ (Redis-based) for scheduled notifications
- Templates: React Email + i18n library

This design extends your current notification system to support multi-channel notifications with user preferences, templates, and event-driven architecture. Should I proceed with implementation details for any specific part?
