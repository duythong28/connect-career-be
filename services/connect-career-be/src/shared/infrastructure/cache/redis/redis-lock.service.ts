import { Injectable } from '@nestjs/common';
import { IDistributedLock } from '../interfaces/distributed-lock.interface';
import Redis from 'ioredis';

@Injectable()
export class RedisLockService implements IDistributedLock {
    private readonly lockPrefix = 'LOCK:';
    private readonly lockValue = '1';

    constructor(private readonly redis: Redis) {}

    private getLockKey(key: string): string {
        return `${this.lockPrefix}${key}`;
    }

    async acquire(key: string, timeoutMs: number): Promise<boolean> {
        const lockKey = this.getLockKey(key);
        const result = await this.redis.set(
            lockKey,
            this.lockValue,
            'PX',
            timeoutMs,
            'NX'
        );
        return result === 'OK';
    }

    async release(key: string): Promise<void> {
        const lockKey = this.getLockKey(key);
        await this.redis.del(lockKey);
    }

    async extend(key: string, timeoutMs: number): Promise<boolean> {
        const lockKey = this.getLockKey(key);
        const ttl = await this.redis.pttl(lockKey);
        
        if (ttl <= 0) {
            return false;
        }

        const result = await this.redis.pexpire(lockKey, timeoutMs);
        return result === 1;
    }
}
