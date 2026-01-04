import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Param,
  Put,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SendNotificationCommand } from '../application/commands/send-notification.command';
import { ScheduleNotificationCommand } from '../application/commands/schedule-notification.command';
import { NotificationResponseDTO } from '../application/dtos/notification-response.dto';
import { CommandBus } from '@nestjs/cqrs';
import { NotificationService } from '../application/services/notification.service';
import { JwtAuthGuard } from 'src/modules/identity/api/guards/jwt-auth.guard';
import * as decorators from 'src/modules/identity/api/decorators';
import { GetNotificationsQueryDto } from '../application/dtos/get-notifications-query.dto';
import { UpdatePreferencesDto } from '../application/dtos/update-prefereces.dto';
import { RegisterPushTokenDto } from '../application/dtos/register-push-token.dto';
import { NotificationQueueService } from 'src/shared/infrastructure/queue/services/notification-queue.service';
import { PushProvider } from '../infrastructure/providers/push/push.provider';
import * as admin from 'firebase-admin';
import { NotificationChannel } from '../domain/entities/notification.entity';
import { ProviderFactory } from '../infrastructure/providers/common/provider.factory';
import { JobAlertEmail } from '../infrastructure/providers/common/template/job-alert.template';
import { render } from '@react-email/components';
import { JobAlertScheduler } from '../infrastructure/schedulers/job-alert.scheduler';
import { JobAlertTestService } from '../application/services/job-alert-test.service';

@ApiTags('Notifications')
@Controller('v1/notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly providerFactory: ProviderFactory,
    private readonly notificationService: NotificationService,
    private readonly notificationQueueService: NotificationQueueService,
    private readonly pushProvider: PushProvider,
    private readonly jobAlertScheduler: JobAlertScheduler,
    private readonly jobAlertTestService: JobAlertTestService,
  ) {}

  @Post('send')
  @ApiOperation({ summary: 'Send a notification (Admin/Internal)' })
  async sendNotification(
    @Body() sendNotificationCommand: SendNotificationCommand,
  ): Promise<NotificationResponseDTO> {
    return this.commandBus.execute(sendNotificationCommand);
  }

  @Post('schedule')
  @ApiOperation({ summary: 'Schedule a notification (Admin/Internal)' })
  async scheduleNotification(
    @Body() scheduleNotificationCommand: ScheduleNotificationCommand,
  ): Promise<NotificationResponseDTO> {
    return this.commandBus.execute(scheduleNotificationCommand);
  }

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
  })
  async getNotifications(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
    @Query() query: GetNotificationsQueryDto,
  ) {
    return this.notificationService.getUserNotifications(user.sub, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved' })
  async getUnreadCount(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.notificationService.getUnreadCount(user.sub);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(
    @Param('id') id: string,
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.notificationService.markAsRead(id, user.sub);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.notificationService.markAllAsRead(user.sub);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get user notification preferences' })
  async getPreferences(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    return this.notificationService.getOrCreatePreferences(user.sub);
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update user notification preferences' })
  async updatePreferences(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.notificationService.updatePreferences(
      user.sub,
      dto.preferences || {},
    );
  }

  @Post('push-token')
  @ApiOperation({ summary: 'Register push notification token' })
  async registerPushToken(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.notificationService.registerPushToken(
      user.sub,
      dto.token,
      dto.platform,
      dto.deviceId,
      dto.deviceName,
    );
  }

  @Get('queue/stats')
  @ApiOperation({ summary: 'Get notification queue statistics (Admin)' })
  async getQueueStats() {
    return this.notificationQueueService.getQueueStats();
  }

  @Get('push/test-connection')
  @decorators.Public()
  @ApiOperation({ summary: 'Test FCM connection and credentials' })
  @ApiResponse({ status: 200, description: 'FCM connection test result' })
  async testFCMConnection() {
    try {
      return await this.pushProvider.testConnection();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Post('push/test')
  @ApiOperation({ summary: 'Send test push notification to current user' })
  @ApiResponse({ status: 200, description: 'Test notification sent' })
  async testPushNotification(
    @decorators.CurrentUser() user: decorators.CurrentUserPayload,
  ) {
    try {
      // Check if user has registered push tokens
      const tokens = await this.notificationService.getPushTokens(user.sub);

      if (tokens.length === 0) {
        throw new BadRequestException(
          'No push tokens registered. Please register a push token first using POST /v1/notifications/push-token',
        );
      }

      // Send test notification
      await this.pushProvider.send(
        user.sub,
        'Test Notification',
        'This is a test push notification from Connect Career!',
        {
          test: true,
          timestamp: new Date().toISOString(),
        },
      );

      return {
        success: true,
        message: 'Test push notification sent successfully',
        tokensCount: tokens.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to send test push notification',
      };
    }
  }

  @Post('push/test/:userId')
  @ApiOperation({
    summary: 'Send test push notification to specific user (Admin)',
  })
  @ApiResponse({ status: 200, description: 'Test notification sent' })
  async testPushNotificationToUser(
    @Param('userId') userId: string,
    @Body() body?: { title?: string; message?: string },
  ) {
    try {
      const tokens = await this.notificationService.getPushTokens(userId);

      if (tokens.length === 0) {
        throw new BadRequestException(
          `No push tokens registered for user ${userId}`,
        );
      }

      await this.pushProvider.send(
        userId,
        body?.title || 'Test Notification',
        body?.message || 'This is a test push notification!',
        {
          test: true,
          timestamp: new Date().toISOString(),
        },
      );

      return {
        success: true,
        message: `Test push notification sent to user ${userId}`,
        tokensCount: tokens.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Post('push/test-direct')
  @ApiOperation({
    summary:
      'Send test push notification directly to FCM token (for testing/debugging)',
  })
  @ApiResponse({ status: 200, description: 'Test notification sent' })
  async testPushNotificationDirect(
    @Body()
    body: {
      fcmToken: string;
      title?: string;
      message?: string;
      metadata?: any;
    },
  ) {
    try {
      if (!body.fcmToken) {
        throw new BadRequestException('FCM token is required');
      }

      // Validate FCM token format (should be a long string)
      if (body.fcmToken.length < 10) {
        throw new BadRequestException('Invalid FCM token format');
      }

      // Send directly using Firebase Admin SDK
      const messaging = admin.messaging();

      const message = {
        token: body.fcmToken,
        notification: {
          title: body.title || 'Test Notification',
          body: body.message || 'This is a direct test push notification!',
        },
        data: {
          test: 'true',
          timestamp: new Date().toISOString(),
          ...(body.metadata || {}),
        },
        webpush: {
          notification: {
            title: body.title || 'Test Notification',
            body: body.message || 'This is a direct test push notification!',
            icon: body.metadata?.icon || '/icon-192x192.png',
            badge: body.metadata?.badge || '/badge-72x72.png',
          },
          fcmOptions: {
            link: body.metadata?.url || body.metadata?.clickAction || '',
          },
        },
      };

      const response = await messaging.send(message);

      return {
        success: true,
        message: 'Test push notification sent successfully',
        messageId: response,
        fcmTokenPreview: `${body.fcmToken.substring(0, 20)}...${body.fcmToken.substring(body.fcmToken.length - 10)}`,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      const errorCode = error.code || error.errorInfo?.code;
      const errorMessage = error.message || error.errorInfo?.message;

      return {
        success: false,
        error: errorMessage,
        errorCode,
        message: 'Failed to send test push notification',
        details:
          errorCode === 'messaging/registration-token-not-registered'
            ? 'The FCM token is not registered or has expired. Make sure the token is valid and the user has the app/browser open.'
            : errorMessage,
      };
    }
  }

  @Post('push/test-batch')
  @ApiOperation({
    summary: 'Send test push notification to multiple FCM tokens at once',
  })
  @ApiResponse({ status: 200, description: 'Test notifications sent' })
  async testPushNotificationBatch(
    @Body()
    body: {
      fcmTokens: string[];
      title?: string;
      message?: string;
      metadata?: any;
    },
  ) {
    try {
      if (
        !body.fcmTokens ||
        !Array.isArray(body.fcmTokens) ||
        body.fcmTokens.length === 0
      ) {
        throw new BadRequestException(
          'fcmTokens array is required and must not be empty',
        );
      }

      if (body.fcmTokens.length > 500) {
        throw new BadRequestException('Maximum 500 tokens allowed per batch');
      }

      const messaging = admin.messaging();

      const messages = body.fcmTokens.map((fcmToken) => ({
        token: fcmToken,
        notification: {
          title: body.title || 'Test Notification',
          body: body.message || 'This is a batch test push notification!',
        },
        data: {
          test: 'true',
          timestamp: new Date().toISOString(),
          ...(body.metadata || {}),
        },
        webpush: {
          notification: {
            title: body.title || 'Test Notification',
            body: body.message || 'This is a batch test push notification!',
            icon: body.metadata?.icon || '/icon-192x192.png',
            badge: body.metadata?.badge || '/badge-72x72.png',
          },
          fcmOptions: {
            link: body.metadata?.url || body.metadata?.clickAction || '',
          },
        },
      }));

      const results = await messaging.sendEach(messages);

      const successCount = results.responses.filter((r) => r.success).length;
      const failureCount = results.responses.filter((r) => !r.success).length;

      const failures = results.responses
        .map((response, index) => ({
          tokenIndex: index,
          tokenPreview: `${body.fcmTokens[index].substring(0, 20)}...${body.fcmTokens[index].substring(body.fcmTokens[index].length - 10)}`,
          error: response.error,
        }))
        .filter((f) => f.error);

      return {
        success: true,
        message: `Batch test push notifications sent`,
        total: body.fcmTokens.length,
        successCount,
        failureCount,
        failures: failures.length > 0 ? failures : undefined,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to send batch test push notifications',
      };
    }
  }
  @Post('email/test-job-alert')
  @ApiOperation({ summary: 'Send test job alert email' })
  async testJobAlertEmail(
    @Body()
    body: {
      recipient: string;
      userFirstname?: string;
      jobTitle?: string;
      locationName?: string;
      jobs?: any[];
      viewAllJobsUrl?: string;
    },
  ) {

    const emailHtml = await render(
      JobAlertEmail({
        userFirstname: body.userFirstname || 'John',
        jobTitle: body.jobTitle || 'Software Engineer',
        locationName: body.locationName || 'Ho Chi Minh City',
        viewAllJobsUrl: body.viewAllJobsUrl || 'https://connectcareer.com/jobs',
        jobs: body.jobs || [
          {
            id: '1',
            title: 'Senior Full-Stack Developer',
            company: 'KMS Technology, Inc.',
            location: 'Ho Chi Minh City, Vietnam (Hybrid)',
            logoUrl: 'https://placehold.co/56x56/47699d/white?text=KMS',
            salary: '$1,500 - $2,500',
            jobType: 'Full-time',
            seniorityLevel: 'Senior',
            jobUrl: 'https://connectcareer.com/jobs/1',
            matchScore: 95,
            postedDate: '2 days ago',
          },
          {
            id: '2',
            title: 'Frontend Developer (React)',
            company: 'Hitachi Digital Services',
            location: 'Ho Chi Minh City Metropolitan Area (Remote)',
            logoUrl: 'https://placehold.co/56x56/f8a600/white?text=H',
            salary: '$1,200 - $2,000',
            jobType: 'Full-time',
            seniorityLevel: 'Mid-level',
            jobUrl: 'https://connectcareer.com/jobs/2',
            matchScore: 88,
            postedDate: '1 day ago',
          },
        ],
      }),
    );

    const provider = this.providerFactory.createProvider(
      NotificationChannel.EMAIL,
    );
    await provider.send(
      body.recipient,
      'New Jobs Matching Your Profile - ConnectCareer',
      emailHtml,
    );

    return {
      success: true,
      message: 'Test job alert email sent successfully',
    };
  }

  @Post('job-alert/trigger')
  @ApiOperation({ summary: 'Manually trigger job alert scheduler' })
  async triggerJobAlert() {
    await this.jobAlertScheduler.executeJobAlerts();
    return { success: true, message: 'Job alerts triggered' };
  }

  @Post('job-alert/test/:userId')
  @ApiOperation({
    summary: 'Test job recommendation alert for specific user (Admin/Test)',
    description:
      'Sends job recommendation push notification (and email if enabled) to a specific user by userId',
  })
  @ApiResponse({ status: 200, description: 'Job alert sent successfully' })
  @ApiResponse({
    status: 400,
    description: 'User not found or no recommendations available',
  })
  async testJobAlertForUser(
    @Param('userId') userId: string,
    @Body() body?: { sendEmail?: boolean; sendPush?: boolean; limit?: number },
  ) {
    return await this.jobAlertTestService.testJobAlertForUser(userId, body);
  }
}
