import { Redis } from 'ioredis';

let redis: Redis | null = null;

export function getRedisConnection(): Redis | null {
  if (redis && redis.status === 'ready') {
    return redis;
  }

  if (redis) {
    return redis; // Let ioredis handle reconnection
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn('[Redis] REDIS_URL not set, rate limiting disabled');
    return null;
  }

  // Warn if not using TLS in production (security best practice)
  if (process.env.NODE_ENV === 'production' && !redisUrl.startsWith('rediss://')) {
    console.warn('[Redis] WARNING: Production should use rediss:// (TLS) URLs for security');
  }

  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 100, 3000);
      console.log(`[Redis] Reconnecting in ${delay}ms (attempt ${times})`);
      return delay;
    },
  });

  redis.on('error', (err: Error) => {
    console.error('[Redis] Connection error:', err.message);
  });

  redis.on('connect', () => {
    console.log('[Redis] Connected');
  });

  return redis;
}

export async function closeRedisConnection(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
