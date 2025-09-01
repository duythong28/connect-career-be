export class RedisValueHelper {
    static toRedisValue<T>(value: T): string {
        if (value === null || value === undefined) {
            return '';
        }
        return typeof value === 'string' ? value : JSON.stringify(value);
    }

    static toRedisValues<T>(values: T[]): string[] {
        return values.map(value => this.toRedisValue(value));
    }

    static fromRedisValue<T>(value: string | null): T | null {
        if (!value) {
            return null;
        }
        try {
            return JSON.parse(value) as T;
        } catch {
            return value as unknown as T;
        }
    }

    static fromRedisValues<T>(values: (string | null)[]): T[] {
        return values
            .filter(value => value !== null)
            .map(value => this.fromRedisValue<T>(value)!)
            .filter(value => value !== null);
    }
}
