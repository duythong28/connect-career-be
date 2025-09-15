import { Injectable } from '@nestjs/common';
import { INotificationProvider } from '../common/notification-provider.interface';

@Injectable()
export class WebSocketProvider implements INotificationProvider {
  async send(recipient: string, title: string, message: string): Promise<void> {
    // This is a mock implementation. In a real-world scenario, you would
    // use a library like Socket.IO to push a message to a specific client.
    console.log('--- Pushing WebSocket Message ---');
    console.log(`Recipient (User ID): ${recipient}`);
    console.log(`Title: ${title}`);
    console.log(`Message: ${message}`);
    console.log('-------------------------------');
    return Promise.resolve();
  }
}
