import { Module, Global, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { RedisCacheService } from './redis/redis-cache.service';

@Global() // Makes it available to all modules
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: Redis,
      useFactory: (configService: ConfigService) => {
        const port = parseInt(configService.get('REDIS_PORT') || '6379', 10);
        const db = parseInt(configService.get('REDIS_DB') || '0', 10);

        const redis = new Redis({
          host: configService.get('REDIS_HOST') || 'localhost',
          port: isNaN(port) ? 6379 : port,
          password: configService.get('REDIS_PASSWORD') || undefined,
          db: isNaN(db) ? 0 : db,
          enableReadyCheck: true,
          enableOfflineQueue: true,
          lazyConnect: false,
          connectTimeout: 10000,
          // Connection pool settings - IMPORTANT for preventing max clients error
          maxRetriesPerRequest: null,
          retryStrategy: (times: number) => {
            // Exponential backoff with max delay
            if (times > 10) {
              return null; // Stop retrying after 10 attempts
            }
            const delay = Math.min(times * 100, 5000);
            return delay;
          },
          // Reconnect on connection errors
          reconnectOnError: (err: Error) => {
            // Reconnect on various connection errors
            const targetErrors = [
              'READONLY',
              'ECONNREFUSED',
              'ETIMEDOUT',
              'ENOTFOUND',
            ];
            if (targetErrors.some((error) => err.message.includes(error))) {
              return true;
            }
            // Don't reconnect on max clients error
            if (err.message.includes('max number of clients reached')) {
              return false;
            }
            return false;
          },
          // Connection pool settings
          keepAlive: 30000, // Keep connections alive
          // Limit connection pool size
          family: 4, // Use IPv4
          showFriendlyErrorStack: true,
        });

        // Handle connection errors
        redis.on('error', (err) => {
          console.error('Redis connection error:', err);
          // Don't reconnect on max clients error
          if (err.message.includes('max number of clients reached')) {
            console.error(
              'Redis max clients reached - check for connection leaks',
            );
          }
        });

        // Handle connection close
        redis.on('close', () => {
          console.log('Redis connection closed');
        });

        // Monitor connection status
        redis.on('connect', () => {
          console.log('Redis connected');
        });

        redis.on('ready', () => {
          console.log('Redis ready');
        });

        return redis;
      },
      inject: [ConfigService],
    },
    {
      provide: 'IDistributedCache',
      useFactory: (redis: Redis, configService: ConfigService) => {
        const keyPrefix =
          configService.get<string>('REDIS_KEY_PREFIX') || 'connect-career:';
        return new RedisCacheService(redis, keyPrefix);
      },
      inject: [Redis, ConfigService],
    },
  ],
  exports: ['IDistributedCache', Redis], // Export Redis for cleanup
})
export class CacheModule implements OnModuleDestroy {
  constructor(private readonly redis: Redis) {}

  async onModuleDestroy() {
    // Properly close Redis connection on module destroy
    if (this.redis && this.redis.status !== 'end') {
      await this.redis.quit();
    }
  }
}
