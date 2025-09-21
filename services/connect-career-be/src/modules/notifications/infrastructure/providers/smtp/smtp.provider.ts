// src/modules/notifications/infrastructure/providers/smtp/smtp.provider.ts
import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transporter } from 'nodemailer';
import { INotificationProvider } from '../common/notification-provider.interface';

@Injectable()
export class SmtpProvider implements INotificationProvider {
  private readonly logger = new Logger(SmtpProvider.name);

  constructor(
    @Inject('NODEMAILER') private readonly transporter: Transporter | null,
    private readonly configService: ConfigService,
  ) {}

  async send(recipient: string, title: string, message: string): Promise<void> {
    try {
      if (!this.transporter) {
        this.logger.log('--- EMAIL (No SMTP Config) ---');
        this.logger.log(`To: ${recipient}`);
        this.logger.log(`Subject: ${title}`);
        this.logger.log(`HTML: ${message.substring(0, 100)}...`);
        this.logger.log('--------------------------------');
        return;
      }

      const mailOptions = {
        from: {
          name:
            this.configService.get<string>('SMTP_FROM_NAME') || 'ConnectCareer',
          address:
            this.configService.get<string>('SMTP_FROM_EMAIL') ||
            this.configService.get<string>('SMTP_USER'),
        },
        to: recipient,
        subject: title,
        html: message,
        text: this.stripHtml(message),
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(
        `Email sent successfully to ${recipient}. MessageId: ${result}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send email to ${recipient}:`, error);
    }
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
