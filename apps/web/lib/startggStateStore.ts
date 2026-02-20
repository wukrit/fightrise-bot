import { Redis } from 'ioredis';

let redis: Redis | null = null;
const inMemoryNonceStore = new Map<string, number>();

function getRedisConnection(): Redis | null {
  if (redis) return redis;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });

  redis.on('error', () => {
    // Fallback to in-memory mode on runtime errors.
  });

  return redis;
}

function cleanupExpiredInMemory(nowMs: number): void {
  for (const [key, expiryMs] of inMemoryNonceStore.entries()) {
    if (expiryMs <= nowMs) {
      inMemoryNonceStore.delete(key);
    }
  }
}

/**
 * Consume a nonce once. Returns true only on first use.
 */
export async function consumeStartggOAuthNonce(nonce: string, ttlSeconds: number): Promise<boolean> {
  const nonceKey = `oauth:startgg:nonce:${nonce}`;
  const connection = getRedisConnection();

  if (connection) {
    try {
      const result = await connection.set(nonceKey, '1', 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch {
      // Fall through to in-memory fallback.
    }
  }

  const nowMs = Date.now();
  cleanupExpiredInMemory(nowMs);

  if (inMemoryNonceStore.has(nonceKey)) {
    return false;
  }

  inMemoryNonceStore.set(nonceKey, nowMs + ttlSeconds * 1000);
  return true;
}
