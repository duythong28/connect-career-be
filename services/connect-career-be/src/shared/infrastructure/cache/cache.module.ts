import { Module, Global } from '@nestjs/common';
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

        return new Redis({
          host: configService.get('REDIS_HOST') || 'localhost',
          port: isNaN(port) ? 6379 : port,
          password: configService.get('REDIS_PASSWORD') || undefined,
          db: isNaN(db) ? 0 : db,
        });
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
  exports: ['IDistributedCache'],
})
export class CacheModule {}
