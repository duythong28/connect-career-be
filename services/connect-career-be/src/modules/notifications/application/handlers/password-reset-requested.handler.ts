import { Injectable } from '@nestjs/common';
import { IEventHandler, EventsHandler } from '@nestjs/cqrs';
import { ProviderFactory } from '../../infrastructure/providers/common/provider.factory';
import { NotificationChannel } from '../../domain/entities/notification.entity';
import { ConfigService } from '@nestjs/config';
import { render } from '@react-email/render';
import PasswordResetEmail from '../../infrastructure/providers/common/template/password-reset-email';
import { PasswordResetRequestedEvent } from 'src/modules/identity/domain/events/password-reset-requested.event';

@Injectable()
@EventsHandler(PasswordResetRequestedEvent)
export class PasswordResetRequestedHandler
  implements IEventHandler<PasswordResetRequestedEvent>
{
  constructor(
    private readonly providerFactory: ProviderFactory,
    private readonly configService: ConfigService,
  ) {}

  async handle(event: PasswordResetRequestedEvent) {
    console.log('PasswordResetRequestedEvent', event);
    const appWebUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'https://app.connect-career.com';
    const resetUrl = `${appWebUrl}/reset-password?token=${encodeURIComponent(event.token)}`;

    const provider = this.providerFactory.createProvider(
      NotificationChannel.EMAIL,
    );
    // Render the React email template to HTML
    const emailHtml = await render(
      PasswordResetEmail({
        userFirstname: event.firstName,
        url: resetUrl,
      }),
    );

    const title = '[CONNECTCAREER] Đặt lại mật khẩu của bạn';

    await provider.send(event.email, title, emailHtml);
  }
}
