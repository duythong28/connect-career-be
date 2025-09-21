import { Injectable } from '@nestjs/common';
import { IEventHandler, EventsHandler } from '@nestjs/cqrs';
import { ProviderFactory } from '../../infrastructure/providers/common/provider.factory';
import { NotificationChannel } from '../../domain/entities/notification.entity';
import { ConfigService } from '@nestjs/config';
import { render } from '@react-email/render';
import { UserRegisteredEvent } from 'src/modules/identity/domain/events/user-register.event';
import WelcomeEmail from '../../infrastructure/providers/common/template/email_template';

@Injectable()
@EventsHandler(UserRegisteredEvent)
export class UserRegisteredHandler
  implements IEventHandler<UserRegisteredEvent>
{
  constructor(
    private readonly providerFactory: ProviderFactory,
    private readonly configService: ConfigService,
  ) {}

  async handle(event: UserRegisteredEvent) {
    console.log('UserRegisteredEvent', event);
    const appWebUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'https://app.connect-career.com';
    const verifyUrl = `${appWebUrl}/verify-email?token=${encodeURIComponent(event.token)}`;

    const provider = this.providerFactory.createProvider(
      NotificationChannel.EMAIL,
    );
    // Render the React email template to HTML
    const emailHtml = await render(
      WelcomeEmail({
        userFirstname: event.firstName,
        url: verifyUrl,
      }),
    );

    const title = '[CONNECTCAREER] Xác thực email của bạn';

    await provider.send(event.email, title, emailHtml);
  }
}
