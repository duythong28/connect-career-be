import { CacheOptions } from './cache-options.interface';

export interface IDistributedCache {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
    remove(key: string): Promise<void>;
    refresh(key: string): Promise<void>;
}
