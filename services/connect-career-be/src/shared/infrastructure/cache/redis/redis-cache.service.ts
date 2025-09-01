import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis/built';
import { IDistributedCache } from '../interfaces/distributed-cache.interface';
import { CacheOptions } from '../interfaces/cache-options.interface';
import { RedisValueHelper } from './redis-value.helper';

@Injectable()
export class RedisCacheService implements IDistributedCache {
    private readonly logger = new Logger(RedisCacheService.name);
    constructor(
        private readonly redis: Redis,
        private readonly keyPrefix: string
    ) { }

    private getRedisKey(key: string): string {
        return key;
    }
    private removePrefix(key: string): string {
        return key.replace(this.keyPrefix, '');
    }

    // IDistributedCache implementation
    async get<T>(key: string): Promise<T | null> {
        return this.stringGet<T>(key);
    }

    async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
        await this.stringSet(key, value, options);
    }

    async remove(key: string): Promise<void> {
        await this.keyDelete(key);
    }

    async refresh(key: string): Promise<void> {
        const ttl = await this.redis.ttl(this.getRedisKey(key));
        if (ttl > 0) {
            const value = await this.stringGet(key);
            if (value !== null) {
                await this.stringSet(key, value, { ttl });
            }
        }
    }

    // Key operations
    async keyDelete(key: string): Promise<boolean> {
        try {
            return await this.keyDeleteMany([key]) > 0;
        } catch (error) {
            this.logger.error(`Failed to delete key: ${error.message}`, error.stack);
            return false;
        }
    }

    async keyDeleteMany(keys: string[]): Promise<number> {
        try {
            return await this.redis.del(...keys.map(key => this.getRedisKey(key)));
        } catch (error) {
            this.logger.error(`Failed to delete keys: ${error.message}`, error.stack);
            return 0;
        }
    }

    async keyExists(key: string): Promise<boolean> {
        const result = await this.redis.exists(this.getRedisKey(key));
        return result === 1;
    }

    async keyExpire(key: string, seconds: number): Promise<boolean> {
        const result = await this.redis.expire(this.getRedisKey(key), seconds);
        return result === 1;
    }

    async keyExpireAt(key: string, timestamp: number): Promise<boolean> {
        const result = await this.redis.expireat(this.getRedisKey(key), timestamp);
        return result === 1;
    }

    getAllKeys(): string[] {
        const keys: string[] = [];
        const stream = this.redis.scanStream({
            match: `${this.keyPrefix}::*`
        });

        stream.on('data', (resultKeys: string[]) => {
            keys.push(...resultKeys);
        });

        return keys;
    }

    async keyPrefixDeleteBy(prefix: string): Promise<boolean> {
        try {
            return await this.keyPatternDeleteBy(`${this.getRedisKey(prefix)}*`);
        } catch (error) {
            this.logger.error(`Failed to delete keys with prefix ${prefix}: ${error.message}`, error.stack);
            return false;
        }
    }

    async keyPatternDeleteBy(pattern: string): Promise<boolean> {
        const keys = await new Promise<string[]>((resolve) => {
            const foundKeys: string[] = [];
            const fullPattern = this.keyPrefix + pattern;
            this.logger.debug("delete by: ", fullPattern);
            const stream = this.redis.scanStream({
                match: fullPattern
            });

            stream.on('data', (resultKeys: string[]) => {
                this.logger.debug("found keys:", resultKeys)
                foundKeys.push(...resultKeys);
            });

            stream.on('end', () => {
                resolve(foundKeys);
            });
        });

        if (!keys.length) return false;
        this.logger.debug("delete keys:", keys)
        const keysWithoutPrefix = keys.map(key => this.removePrefix(key));
        const numberKeyRemoved = await this.keyDeleteMany(keysWithoutPrefix);
        return numberKeyRemoved > 0;
    }

    // String operations
    async stringSet<T>(key: string, value: T, options?: CacheOptions): Promise<boolean> {
        try {
            const redisKey = this.getRedisKey(key);
            const redisValue = RedisValueHelper.toRedisValue(value);

            if (options?.ttl) {
                return await this.redis.setex(redisKey, options.ttl, redisValue) === 'OK';
            }
            return await this.redis.set(redisKey, redisValue) === 'OK';
        } catch (error) {
            this.logger.error(`Failed to set ${key}: ${error.message}`, error.stack);
            return false;
        }
    }

    async stringGet<T>(key: string): Promise<T | null> {
        try {
            const value = await this.redis.get(this.getRedisKey(key));
            return RedisValueHelper.fromRedisValue<T>(value);
        } catch (error) {
            this.logger.error(`Failed to get ${key}: ${error.message}`, error.stack);
            return null;
        }
    }

    async stringIncrement(key: string, value = 1): Promise<number> {
        return await this.redis.incrby(this.getRedisKey(key), value);
    }

    async stringDecrement(key: string, value = 1): Promise<number> {
        return await this.redis.decrby(this.getRedisKey(key), value);
    }

    // List operations
    async listLength(key: string): Promise<number> {
        return await this.redis.llen(this.getRedisKey(key));
    }

    async listLeftPush<T>(key: string, ...values: T[]): Promise<number> {
        return await this.redis.lpush(
            this.getRedisKey(key),
            ...RedisValueHelper.toRedisValues(values)
        );
    }

    async listRightPush<T>(key: string, ...values: T[]): Promise<number> {
        return await this.redis.rpush(
            this.getRedisKey(key),
            ...RedisValueHelper.toRedisValues(values)
        );
    }

    async listRightPop<T>(key: string): Promise<T | null> {
        const value = await this.redis.rpop(this.getRedisKey(key));
        return RedisValueHelper.fromRedisValue<T>(value);
    }

    async listRange<T>(key: string, start = 0, stop = -1): Promise<T[]> {
        const values = await this.redis.lrange(this.getRedisKey(key), start, stop);
        return RedisValueHelper.fromRedisValues<T>(values);
    }

    async listPosition<T>(key: string, element: T): Promise<number> {
        const value = RedisValueHelper.toRedisValue(element);
        const result = await this.redis.lpos(this.getRedisKey(key), value);
        return result ?? -1;
    }

    async listSetByIndex<T>(key: string, index: number, value: T): Promise<void> {
        await this.redis.lset(
            this.getRedisKey(key),
            index,
            RedisValueHelper.toRedisValue(value)
        );
    }

    async listRemove<T>(key: string, value: T, count = 0): Promise<number> {
        return await this.redis.lrem(
            this.getRedisKey(key),
            count,
            RedisValueHelper.toRedisValue(value)
        );
    }

    // Set operations
    async setAdd<T>(key: string, member: T): Promise<boolean> {
        try {
            return await this.redis.sadd(
                this.getRedisKey(key),
                RedisValueHelper.toRedisValue(member)
            ) === 1;
        } catch (error) {
            this.logger.error(`Failed to add to set ${key}: ${error.message}`, error.stack);
            return false;
        }
    }

    async setAddMany<T>(key: string, members: T[]): Promise<number> {
        try {
            return await this.redis.sadd(
                this.getRedisKey(key),
                ...RedisValueHelper.toRedisValues(members)
            );
        } catch (error) {
            this.logger.error(`Failed to add multiple to set ${key}: ${error.message}`, error.stack);
            return 0;
        }
    }

    async setMembers<T>(key: string): Promise<T[]> {
        try {
            const members = await this.redis.smembers(this.getRedisKey(key));
            return RedisValueHelper.fromRedisValues<T>(members);
        } catch (error) {
            this.logger.error(`Failed to get set members ${key}: ${error.message}`, error.stack);
            return [];
        }
    }

    async setPop<T>(key: string, count: number): Promise<T[]> {
        try {
            const members = await this.redis.spop(this.getRedisKey(key), count);
            return RedisValueHelper.fromRedisValues<T>(Array.isArray(members) ? members : [members]);
        } catch (error) {
            this.logger.error(`Failed to pop from set ${key}: ${error.message}`, error.stack);
            return [];
        }
    }

    async setRandomMembers<T>(key: string, count: number): Promise<T[]> {
        try {
            const members = await this.redis.srandmember(this.getRedisKey(key), count);
            return RedisValueHelper.fromRedisValues<T>(Array.isArray(members) ? members : [members]);
        } catch (error) {
            this.logger.error(`Failed to get random members ${key}: ${error.message}`, error.stack);
            return [];
        }
    }

    async setRemove<T>(key: string, member: T): Promise<boolean> {
        try {
            return await this.redis.srem(
                this.getRedisKey(key),
                RedisValueHelper.toRedisValue(member)
            ) === 1;
        } catch (error) {
            this.logger.error(`Failed to remove from set ${key}: ${error.message}`, error.stack);
            return false;
        }
    }

    async setLength(key: string): Promise<number> {
        return await this.redis.scard(this.getRedisKey(key));
    }

    // Sorted Set operations
    async sortedSetAdd<T>(key: string, member: T, score: number): Promise<boolean> {
        try {
            return await this.redis.zadd(
                this.getRedisKey(key),
                score,
                RedisValueHelper.toRedisValue(member)
            ) === 1;
        } catch (error) {
            this.logger.error(`Failed to add to sorted set ${key}: ${error.message}`, error.stack);
            return false;
        }
    }

    async sortedSetAddMany<T>(key: string, members: Map<T, number>): Promise<boolean> {
        try {
            const args: (string | number)[] = [];
            members.forEach((score, member) => {
                args.push(score, RedisValueHelper.toRedisValue(member));
            });

            const added = await this.redis.zadd(this.getRedisKey(key), ...args);
            return added === members.size;
        } catch (error) {
            this.logger.error(`Failed to add multiple to sorted set ${key}: ${error.message}`, error.stack);
            return false;
        }
    }

    async sortedSetRemoveRangeByScore(key: string, min: number, max: number): Promise<number> {
        return await this.redis.zremrangebyscore(this.getRedisKey(key), min, max);
    }

    async sortedSetPop<T>(key: string, count: number, order = 'ASC'): Promise<T[]> {
        const result = await this.redis.zpopmin(this.getRedisKey(key), count);
        return RedisValueHelper.fromRedisValues<T>(
            result.filter((_, index) => index % 2 === 0)
        );
    }

    async sortedSetRangeByRank<T>(
        key: string,
        start = 0,
        stop = -1,
        order: 'ASC' | 'DESC' = 'ASC'
    ): Promise<T[]> {
        try {
            const values = order === 'ASC'
                ? await this.redis.zrange(this.getRedisKey(key), start, stop)
                : await this.redis.zrevrange(this.getRedisKey(key), start, stop);
            return RedisValueHelper.fromRedisValues<T>(values);
        } catch (error) {
            this.logger.error(`Failed to get range from sorted set ${key}: ${error.message}`, error.stack);
            return [];
        }
    }

    async sortedSetLength(key: string): Promise<number> {
        return await this.redis.zcard(this.getRedisKey(key));
    }

    // Hash operations
    async hashDeleteFields(key: string, ...fields: string[]): Promise<boolean> {
        if (!fields.length) return false;

        let success = true;
        for (const field of fields) {
            const deleted = await this.redis.hdel(this.getRedisKey(key), field);
            if (deleted === 0) success = false;
        }
        return success;
    }

    async hashGetAll<T>(key: string): Promise<Record<string, T>> {
        const result = await this.redis.hgetall(this.getRedisKey(key));
        const parsed: Record<string, T> = {};

        for (const [field, value] of Object.entries(result)) {
            const parsedValue = RedisValueHelper.fromRedisValue<T>(value);
            if (parsedValue !== null) {
                parsed[field] = parsedValue;
            }
        }

        return parsed;
    }

    async hashGetFields<T>(key: string, ...fields: string[]): Promise<Record<string, T | null>> {
        const values = await this.redis.hmget(this.getRedisKey(key), ...fields);
        return Object.fromEntries(
            fields.map((field, index) => [
                field,
                RedisValueHelper.fromRedisValue<T>(values[index])
            ])
        );
    }

    async hashSet<T>(key: string, field: string, value: T): Promise<boolean> {
        return await this.redis.hset(
            this.getRedisKey(key),
            field,
            RedisValueHelper.toRedisValue(value)
        ) === 1;
    }

    async hashGet<T>(key: string, field: string): Promise<T | null> {
        const value = await this.redis.hget(this.getRedisKey(key), field);
        return RedisValueHelper.fromRedisValue<T>(value);
    }

    async hashSetFields<T>(key: string, fields: Record<string, T>): Promise<void> {
        if (!Object.keys(fields).length) return;

        const entries = Object.entries(fields).map(([field, value]) => [
            field,
            RedisValueHelper.toRedisValue(value)
        ]);

        await this.redis.hmset(this.getRedisKey(key), Object.fromEntries(entries));
    }

    async hashIncrease(key: string, field: string, value = 1): Promise<number> {
        return await this.redis.hincrby(this.getRedisKey(key), field, value);
    }

    async hashGetKeys(key: string): Promise<string[]> {
        return await this.redis.hkeys(this.getRedisKey(key));
    }

    async hashGetAllValues<T>(key: string): Promise<T[]> {
        const values = await this.redis.hvals(this.getRedisKey(key));
        return RedisValueHelper.fromRedisValues<T>(values);
    }

    // Pub/Sub operations
    async publish(channel: string, message: string): Promise<number> {
        return await this.redis.publish(channel, message);
    }

    // Batch operations
    async executeBatch(operations: (() => Promise<void>)[]): Promise<void> {
        const pipeline = this.redis.pipeline();

        for (const operation of operations) {
            await operation();
        }

        await pipeline.exec();
    }
}
