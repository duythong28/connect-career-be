// src/modules/notifications/infrastructure/providers/smtp/nodemailer.provider.ts
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

export const NodemailerProvider = {
  provide: 'NODEMAILER',
  useFactory: (configService: ConfigService): Transporter | null => {
    const host = configService.get<string>('SMTP_HOST');
    const user = configService.get<string>('SMTP_USER');
    const pass = configService.get<string>('SMTP_PASS');

    // Return null if not configured
    if (!host || !user || !pass) {
      console.log('[NodemailerProvider] SMTP not configured - returning null');
      return null;
    }

    const options: SMTPTransport.Options = {
      host,
      port: configService.get<number>('SMTP_PORT') || 587,
      secure: configService.get<boolean>('SMTP_SECURE') || false,
      auth: { user, pass },
    };

    const transporter = createTransport(options);

    // Verify connection async
    transporter.verify().then(
      () => console.log('[NodemailerProvider] SMTP connection verified'),
      (error) =>
        console.error('[NodemailerProvider] SMTP verification failed:', error),
    );

    return transporter;
  },
  inject: [ConfigService],
};
