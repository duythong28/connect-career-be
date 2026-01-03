import { Injectable, Logger } from '@nestjs/common';
import { INotificationProvider } from '../common/notification-provider.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { PushNotificationToken } from 'src/modules/notifications/domain/entities/push-notification-token.entity';
import { Repository } from 'typeorm';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';
import path from 'path';
import * as webpush from 'web-push';

@Injectable()
export class PushProvider implements INotificationProvider {
  private readonly logger = new Logger(PushProvider.name);
  constructor(
    @InjectRepository(PushNotificationToken)
    private readonly pushTokenRepository: Repository<PushNotificationToken>,
    private readonly configService: ConfigService,
  ) {
    if (!admin.apps.length) {
      try {
        // Get path from env or use default
        const serviceAccountPath = 
          this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH') ||
          path.join(
            __dirname,
            '../../../credentials/connect-career-be-5ae57-firebase-adminsdk-fbsvc-d07d7be13a.json',
          );
        
        const serviceAccount = require(serviceAccountPath);
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        
        this.logger.log(`Firebase Admin initialized from: ${serviceAccountPath}`);
      } catch (error) {
        this.logger.error('Failed to initialize Firebase Admin', error);
      }
    } else {
      this.logger.log('Firebase Admin already initialized');
    }
    this.initializeWebPush();
  }

  private initializeWebPush(): void {
    try {
      const vapidPublicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
      const vapidPrivateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
      const vapidSubject =
        this.configService.get<string>('VAPID_SUBJECT') ||
        'mailto:support@connectcareer.com';

      if (vapidPublicKey && vapidPrivateKey) {
        webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
        this.logger.log('Web Push (VAPID) initialized successfully');
      } else {
        this.logger.warn(
          'VAPID keys not configured. Web push notifications will not work.',
        );
      }
    } catch (error) {
      this.logger.error('Failed to initialize Web Push', error);
    }
  }

  async testConnection(): Promise<{
    success: boolean;
    message: string;
    fcm?: { initialized: boolean; projectId?: string };
    webPush?: { initialized: boolean };
  }> {
    try {
      const result: any = {
        success: true,
        message: 'Push notification services status',
      };

      // Test FCM
      if (admin.apps && admin.apps.length > 0) {
        const app = admin.app();
        result.fcm = {
          initialized: true,
          projectId: app.options.projectId,
        };
      } else {
        result.fcm = { initialized: false };
        result.success = false;
      }

      // Test Web Push
      const vapidPublicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
      const vapidPrivateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
      result.webPush = {
        initialized: !!(vapidPublicKey && vapidPrivateKey),
      };

      if (!result.webPush.initialized) {
        this.logger.warn('Web Push not configured (missing VAPID keys)');
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to test push connection', error);
      return {
        success: false,
        message: 'Push connection test failed: ' + (error instanceof Error ? error.message : String(error)),
      };
    }
  }

  async send(
    recipient: string,
    title: string,
    message: string,
    metadata?: any,
  ): Promise<void> {
    // Get all active push tokens for the user
    const tokens = await this.pushTokenRepository.find({
      where: { userId: recipient, isActive: true },
    });

    if (tokens.length === 0) {
      throw new Error(`No active push tokens found for user ${recipient}`);
    }

    // Group tokens by platform
    const fcmTokens = tokens.filter((t) => t.platform === 'fcm' || t.platform === 'apns');
    const webTokens = tokens.filter((t) => t.platform === 'web');

    const promises: Promise<any>[] = [];

    if (fcmTokens.length > 0) {
      promises.push(this.sendFCM(fcmTokens, title, message, metadata));
    }

    if (webTokens.length > 0) {
      promises.push(this.sendWebPush(webTokens, title, message, metadata));
    }

    const results = await Promise.allSettled(promises);

    // Log results
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const platform = index === 0 ? 'FCM' : 'Web Push';
        this.logger.error(`Failed to send ${platform} notifications`, result.reason);
      }
    });
  }

  private async sendFCM(
    tokens: PushNotificationToken[],
    title: string,
    message: string,
    metadata?: any,
  ): Promise<void> {
    if (!admin.apps || admin.apps.length === 0) {
      throw new Error('Firebase Admin not initialized');
    }

    // Convert metadata to string-only format for FCM
    // FCM requires all data values to be strings
    const fcmData: Record<string, string> = {};
    if (metadata) {
      Object.keys(metadata).forEach((key) => {
        const value = metadata[key];
        // Convert all values to strings
        if (value !== null && value !== undefined) {
          if (typeof value === 'object') {
            // Stringify objects/arrays
            fcmData[key] = JSON.stringify(value);
          } else {
            // Convert primitives to strings
            fcmData[key] = String(value);
          }
        }
      });
    }

    const messages = tokens.map((token) => ({
      token: token.token,
      notification: {
        title,
        body: message,
      },
      data: fcmData,
      android: {
        priority: 'high' as const,
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    }));

    try {
      const results = await admin.messaging().sendEach(messages);

      // Handle failed tokens
      results.responses.forEach(async (response, index) => {
        if (!response.success) {
          const token = tokens[index];
          if (
            response.error?.code === 'messaging/invalid-registration-token' ||
            response.error?.code === 'messaging/registration-token-not-registered'
          ) {
            token.isActive = false;
            await this.pushTokenRepository.update(token.id, { isActive: false });
            this.logger.warn(`Deactivated invalid FCM token ${token.id}`);
          } else {
            this.logger.error(
              `FCM send failed for token ${token.id}:`,
              response.error,
            );
          }
        }
      });

      this.logger.log(
        `FCM: Sent ${results.successCount}/${tokens.length} notifications`,
      );
    } catch (error) {
      this.logger.error('Failed to send FCM notifications', error);
      throw error;
    }
  }

  private async sendWebPush(
    tokens: PushNotificationToken[],
    title: string,
    message: string,
    metadata?: any,
  ): Promise<void> {
    if (!admin.apps || admin.apps.length === 0) {
      throw new Error('Firebase Admin not initialized');
    }

    const fcmTokens: Array<{ token: PushNotificationToken; fcmToken: string }> = [];

    for (const token of tokens) {
      try {
        let subscription: any;

        if (typeof token.token === 'object' && token.token !== null) {
          subscription = token.token;
        } else if (typeof token.token === 'string') {
          const trimmed = token.token.trim();
          if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            subscription = JSON.parse(token.token);
          } else {
            this.logger.error(
              `Web push token ${token.id} is not in JSON format. Expected JSON subscription object.`,
            );
            token.isActive = false;
            await this.pushTokenRepository.save(token);
            continue;
          }
        } else {
          this.logger.error(
            `Invalid token type for web push token ${token.id}: ${typeof token.token}`,
          );
          token.isActive = false;
          await this.pushTokenRepository.save(token);
          continue;
        }

        // Validate subscription structure
        if (!subscription?.endpoint || typeof subscription.endpoint !== 'string') {
          this.logger.error(`Invalid subscription: missing endpoint for token ${token.id}`);
          token.isActive = false;
          await this.pushTokenRepository.save(token);
          continue;
        }

        // Check if it's an FCM endpoint
        if (subscription.endpoint.includes('fcm.googleapis.com')) {
          const fcmTokenMatch = subscription.endpoint.match(/\/send\/([^\/\?]+)/);
          console.log('fcmTokenMatch', fcmTokenMatch);
          if (fcmTokenMatch && fcmTokenMatch[1]) {
            fcmTokens.push({
              token,
              fcmToken: fcmTokenMatch[1],
            });
          } else {
            this.logger.warn(
              `Could not extract FCM token from endpoint for token ${token.id}. Endpoint: ${subscription.endpoint.substring(0, 100)}`,
            );
            token.isActive = false;
            await this.pushTokenRepository.save(token);
          }
        } else {
          this.logger.warn(
            `Web push token ${token.id} has non-FCM endpoint: ${subscription.endpoint}. Only FCM endpoints are supported.`,
          );
          token.isActive = false;
          await this.pushTokenRepository.save(token);
        }
      } catch (error) {
        this.logger.error(
          `Failed to parse web push token ${token.id}:`,
          error instanceof Error ? error.message : String(error),
        );
        token.isActive = false;
        await this.pushTokenRepository.save(token);
      }
    }

    if (fcmTokens.length === 0) {
      this.logger.warn('No valid FCM tokens extracted from web push subscriptions');
      return;
    }

    // Convert metadata to string format for FCM
    const fcmData: Record<string, string> = {};
    if (metadata) {
      Object.keys(metadata).forEach((key) => {
        const value = metadata[key];
        if (value !== null && value !== undefined) {
          fcmData[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
        }
      });
    }

    // Build FCM messages for web push
    const messages = fcmTokens.map(({ fcmToken }) => ({
      token: fcmToken,
      notification: {
        title,
        body: message,
      },
      data: fcmData,
      webpush: {
        notification: {
          title,
          body: message,
          icon: metadata?.icon || '/icon-192x192.png',
          badge: metadata?.badge || '/badge-72x72.png',
        },
        fcmOptions: {
          link: metadata?.url || metadata?.clickAction || '',
        },
      },
    }));

    try {
      const results = await admin.messaging().sendEach(messages);

      // Handle responses
      results.responses.forEach(async (response, index) => {
        const { token } = fcmTokens[index];
        if (!response.success) {
          const errorCode = response.error?.code;
          console.error('errorCode', errorCode);
          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            token.isActive = false;
            await this.pushTokenRepository.update(token.id, { isActive: false });
            this.logger.warn(`Deactivated invalid FCM web push token ${token.id}`);
          } else {
            this.logger.error(
              `FCM web push failed for token ${token.id}:`,
              response.error,
            );
          }
        }
      });

      this.logger.log(
        `FCM Web Push: Sent ${results.successCount}/${fcmTokens.length} notifications`,
      );
    } catch (error) {
      this.logger.error('Failed to send FCM web push notifications', error);
      throw error;
    }
  }

}
