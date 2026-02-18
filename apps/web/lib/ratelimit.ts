import { Redis } from 'ioredis';

let redis: Redis | null = null;

/**
 * Get Redis connection for rate limiting
 * Returns null if Redis isn't available (fail open for test environments)
 */
function getRedisConnection(): Redis | null {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.warn('[RateLimit] REDIS_URL not set, rate limiting disabled');
      return null;
    }

    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      retryStrategy: (times: number) => {
        if (times > 1) {
          console.error('[RateLimit] Redis connection failed, rate limiting disabled');
          return null; // Stop retrying
        }
        return 100;
      },
    });

    redis.on('error', (err: Error) => {
      console.error('[RateLimit] Redis error:', err.message);
    });
  }
  return redis;
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

/**
 * Default rate limit configurations
 */
export const RATE_LIMIT_CONFIGS = {
  // Strict limit for auth endpoints (5 per minute)
  auth: { limit: 5, windowMs: 60000 },
  // Stricter limit for health check (10 per second)
  health: { limit: 10, windowMs: 1000 },
  // General API limit (100 per minute)
  api: { limit: 100, windowMs: 60000 },
} as const;

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

/**
 * Check rate limit using Redis sliding window algorithm
 * @param key - Identifier (usually IP address)
 * @param config - Rate limit configuration
 */
export async function checkRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  const r = getRedisConnection();

  // Fail open if Redis isn't available
  if (!r) {
    return {
      allowed: true,
      remaining: config.limit,
      reset: Date.now() + config.windowMs,
    };
  }

  const now = Date.now();
  const windowStart = now - config.windowMs;
  const windowKey = `ratelimit:${key}`;

  try {
    // Use Redis transaction for atomicity
    const pipeline = r.pipeline();

    // Remove expired entries outside the window
    pipeline.zremrangebyscore(windowKey, 0, windowStart);

    // Count current requests in window
    pipeline.zcard(windowKey);

    // Add current request
    pipeline.zadd(windowKey, now.toString(), `${now}-${Math.random()}`);

    // Set expiry on the key
    pipeline.pexpire(windowKey, config.windowMs);

    const results = await pipeline.exec();

    if (!results) {
      // Fallback: allow request if Redis fails
      return {
        allowed: true,
        limit: config.limit,
        remaining: config.limit - 1,
        resetTime: now + config.windowMs,
      };
    }

    const currentCount = results[1]?.[1] as number;

    const resetTime = now + config.windowMs;

    if (currentCount >= config.limit) {
      // Rate limit exceeded
      return {
        allowed: false,
        limit: config.limit,
        remaining: 0,
        resetTime,
      };
    }

    return {
      allowed: true,
      limit: config.limit,
      remaining: config.limit - currentCount - 1,
      resetTime,
    };
  } catch (error) {
    console.error('[RateLimit] Error checking rate limit:', error);
    // Fail open - allow request if Redis fails
    return {
      allowed: true,
      limit: config.limit,
      remaining: config.limit - 1,
      resetTime: now + config.windowMs,
    };
  }
}

/**
 * Get client IP from request headers
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') ?? '127.0.0.1';
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(result: RateLimitResult): Headers {
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.resetTime.toString());

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
    headers.set('Retry-After', retryAfter.toString());
  }

  return headers;
}

/**
 * Middleware helper to apply rate limiting to an API route
 */
export async function withRateLimit(
  request: Request,
  config: RateLimitConfig,
  handler: () => Promise<Response>
): Promise<Response> {
  const ip = getClientIp(request);
  const result = await checkRateLimit(ip, config);
  const headers = createRateLimitHeaders(result);

  if (!result.allowed) {
    return new Response('Too Many Requests', {
      status: 429,
      headers,
    });
  }

  const response = await handler();

  // Add rate limit headers to successful response too
  for (const [key, value] of headers.entries()) {
    response.headers.set(key, value);
  }

  return response;
}

/**
 * Close Redis connection (for graceful shutdown)
 */
export async function closeRateLimitRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
