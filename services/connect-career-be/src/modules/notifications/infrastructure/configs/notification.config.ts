import { ConfigService } from '@nestjs/config';

export const notificationsConfig = (configService: ConfigService) => ({
  smtp: {
    host: configService.get<string>('SMTP_HOST'),
    port: configService.get<number>('SMTP_PORT'),
    user: configService.get<string>('SMTP_USER'),
    pass: configService.get<string>('SMTP_PASS'),
  },
  sms: {
    provider: configService.get<string>('SMS_PROVIDER'),
    apiKey: configService.get<string>('SMS_API_KEY'),
    apiSecret: configService.get<string>('SMS_API_SECRET'),
  },
  websocket: {
    url: configService.get<string>('WEBSOCKET_URL'),
    port: configService.get<number>('WEBSOCKET_PORT'),
  },
});