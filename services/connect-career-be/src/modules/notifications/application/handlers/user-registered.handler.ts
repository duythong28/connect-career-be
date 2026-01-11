import { Injectable, Logger } from '@nestjs/common';
import { IEventHandler, EventsHandler } from '@nestjs/cqrs';
import { ProviderFactory } from '../../infrastructure/providers/common/provider.factory';
import { NotificationChannel } from '../../domain/entities/notification.entity';
import { ConfigService } from '@nestjs/config';
import { render } from '@react-email/render';
import { UserRegisteredEvent } from 'src/modules/identity/domain/events/user-register.event';
import WelcomeEmail from '../../infrastructure/providers/common/template/email_template';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserNotificationPreferences } from '../../domain/entities/user-notification-preferences.entity';

@Injectable()
@EventsHandler(UserRegisteredEvent)
export class UserRegisteredHandler
  implements IEventHandler<UserRegisteredEvent>
{
  private readonly logger = new Logger(UserRegisteredHandler.name);
  constructor(
    private readonly providerFactory: ProviderFactory,
    private readonly configService: ConfigService,
    @InjectRepository(UserNotificationPreferences)
    private readonly preferencesRepository: Repository<UserNotificationPreferences>,
  ) {}

  async handle(event: UserRegisteredEvent) {
    console.log('UserRegisteredEvent', event);
    const appWebUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'https://connect-career.vercel.app';
    const verifyUrl = `${appWebUrl}/verify-email?token=${encodeURIComponent(event.token)}`;

    try {
      const provider = this.providerFactory.createProvider(
        NotificationChannel.EMAIL,
      );

      if (provider) {
        // Render the React email template to HTML
        const emailHtml = await render(
          WelcomeEmail({
            userFirstname: event.firstName,
            url: verifyUrl,
          }),
        );

        const title = '[CONNECTCAREER] Verify your email';
        await provider.send(event.email, title, emailHtml);
        this.logger.log(
          `Verification email sent successfully to ${event.email}`,
        );
      } else {
        this.logger.warn('Email provider not configured, skipping email send');
      }
    } catch (error) {
      // Log error but don't fail the handler - preferences should still be created
      this.logger.error(
        `Failed to send verification email to ${event.email}:`,
        error.message || error,
      );
      // Optionally, you could queue a retry here or send to a dead letter queue
    }

    await this.createDefaultPreferences(event.userId);
  }

  private async createDefaultPreferences(userId: string): Promise<void> {
    const existing = await this.preferencesRepository.findOne({
      where: { userId },
    });

    if (!existing) {
      const preferences = this.preferencesRepository.create({
        userId,
        preferences: {
          email: {
            enabled: true,
            types: ['job_recommendation'], // Job alerts enabled by default
            frequency: 'realtime',
          },
          push: {
            enabled: true,
            types: ['job_recommendation'], // Job alerts enabled by default
          },
          sms: {
            enabled: false,
            types: [],
            phoneNumber: null,
          },
          inApp: {
            enabled: true,
            markAsRead: false,
          },
        },
      });
      await this.preferencesRepository.save(preferences);
    }
  }
}
