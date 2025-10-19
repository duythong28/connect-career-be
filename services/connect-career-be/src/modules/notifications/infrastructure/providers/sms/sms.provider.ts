import { Injectable } from '@nestjs/common';
import { INotificationProvider } from '../common/notification-provider.interface';

@Injectable()
export class SmsProvider implements INotificationProvider {
  async send(recipient: string, title: string, message: string): Promise<void> {
    // This is a mock implementation. In a real-world scenario, you would
    // use a service like Twilio to send an actual SMS.
    console.log('--- Sending SMS ---');
    console.log(`Recipient: ${recipient}`);
    console.log(`Title: ${title}`);
    console.log(`Message: ${message}`);
    console.log('-------------------');
    return Promise.resolve();
  }
}
