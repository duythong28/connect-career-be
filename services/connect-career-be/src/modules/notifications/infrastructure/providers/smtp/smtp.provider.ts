import { Injectable } from '@nestjs/common';
import { INotificationProvider } from '../common/notification-provider.interface';

@Injectable()
export class SmtpProvider implements INotificationProvider {
  async send(recipient: string, title: string, message: string): Promise<void> {
    // This is a mock implementation. In a real-world scenario, you would
    // use a library like Nodemailer to send an actual email.
    console.log('--- Sending Email (SMTP) ---');
    console.log(`Recipient: ${recipient}`);
    console.log(`Title: ${title}`);
    console.log(`Message: ${message}`);
    console.log('--------------------------');
    return Promise.resolve();
  }
}