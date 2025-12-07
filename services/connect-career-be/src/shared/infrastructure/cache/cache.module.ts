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
          // Critical: Prevent connection leaks
          maxRetriesPerRequest: 3, // Limit retries to prevent connection buildup
          enableReadyCheck: true,
          enableOfflineQueue: false, // Don't queue commands when offline
          lazyConnect: false,
          connectTimeout: 10000,
          // Retry strategy with exponential backoff
          retryStrategy: (times: number) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          // Reconnect on specific errors only
          reconnectOnError: (err: Error) => {
            const targetError = 'READONLY';
            if (err.message.includes(targetError)) {
              return true;
            }
            return false;
          },
          // Connection pool settings
          keepAlive: 30000, // Keep connections alive
        });

        // Handle connection errors
        redis.on('error', (err) => {
          console.error('Redis connection error:', err);
        });

        // Handle connection close
        redis.on('close', () => {
          console.log('Redis connection closed');
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