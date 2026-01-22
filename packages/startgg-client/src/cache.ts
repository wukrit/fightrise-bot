import { CacheConfig } from './types.js';

const DEFAULT_TTL_MS = 60 * 1000; // 1 minute

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class ResponseCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private enabled: boolean;
  private ttlMs: number;

  constructor(config: CacheConfig = { enabled: true }) {
    this.enabled = config.enabled;
    this.ttlMs = config.ttlMs ?? DEFAULT_TTL_MS;
  }

  private generateKey(method: string, params: Record<string, unknown>): string {
    return `${method}:${JSON.stringify(params)}`;
  }

  private isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() > entry.expiresAt;
  }

  get<T>(method: string, params: Record<string, unknown>): T | undefined {
    if (!this.enabled) {
      return undefined;
    }

    const key = this.generateKey(method, params);
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  set<T>(method: string, params: Record<string, unknown>, value: T): void {
    if (!this.enabled) {
      return;
    }

    const key = this.generateKey(method, params);
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + this.ttlMs,
    };

    this.cache.set(key, entry);
  }

  invalidate(method?: string): void {
    if (method) {
      // Invalidate all entries for a specific method
      const prefix = `${method}:`;
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Invalidate all entries
      this.cache.clear();
    }
  }

  invalidateByParams(
    method: string,
    params: Record<string, unknown>
  ): void {
    const key = this.generateKey(method, params);
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clear();
    }
  }

  setTtl(ttlMs: number): void {
    this.ttlMs = ttlMs;
  }
}
