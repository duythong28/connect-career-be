export interface IDistributedLock {
  acquire(key: string, timeoutMs: number): Promise<boolean>;
  release(key: string): Promise<void>;
  extend(key: string, timeoutMs: number): Promise<boolean>;
}
