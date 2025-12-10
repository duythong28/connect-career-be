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

@ApiTags('Notifications')
@Controller('v1/notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly notificationService: NotificationService,
    private readonly notificationQueueService: NotificationQueueService,
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
}
