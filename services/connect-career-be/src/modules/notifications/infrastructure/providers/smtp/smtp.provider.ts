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

      // Check if message contains HTML (including escaped HTML)
      const hasHtmlTags = /<[a-z][\s\S]*>/i.test(message);
      const hasEscapedHtml = /&lt;[a-z][\s\S]*&gt;/i.test(message);

      // If HTML is escaped, unescape it
      let htmlContent = message;
      if (hasEscapedHtml && !hasHtmlTags) {
        // Unescape HTML entities
        htmlContent = message
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, '&');
        this.logger.log(`[SmtpProvider] Unescaped HTML content`);
      }

      // Check again after unescaping
      const isHtml = /<[a-z][\s\S]*>/i.test(htmlContent) || hasEscapedHtml;

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
        // Always set HTML if we detected HTML (escaped or not)
        html: isHtml ? htmlContent : undefined,
        text: isHtml ? this.stripHtml(htmlContent) : htmlContent,
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(
        `Email sent successfully to ${recipient}. MessageId: ${result.messageId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send email to ${recipient}:`, error);
      throw error; // Re-throw so the queue can retry
    }
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
