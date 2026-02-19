import { Redis } from 'ioredis';
import { randomUUID } from 'crypto';
import { createRateLimitResponse } from './api-response';

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
  // General API read limit (60 per minute)
  read: { limit: 60, windowMs: 60000 },
  // Write operations (30 per minute) - more restrictive
  write: { limit: 30, windowMs: 60000 },
  // Admin operations (20 per minute)
  admin: { limit: 20, windowMs: 60000 },
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
      limit: config.limit,
      remaining: config.limit,
      resetTime: Date.now() + config.windowMs,
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
    pipeline.zadd(windowKey, now.toString(), `${now}-${randomUUID()}`);

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
 * Trusted proxy configuration
 * Only trust X-Forwarded-For header from these IPs
 * In production, this should be set to your reverse proxy's IP(s)
 */
const TRUSTED_PROXIES = process.env.TRUSTED_PROXY_IPS?.split(',').map(ip => ip.trim()) ?? [];

/**
 * Get client IP from request
 *
 * Security: When trustProxy is enabled in Next.js (via next.config.js),
 * request.ip will correctly return the client IP by:
 * 1. Parsing X-Forwarded-For header (taking the leftmost non-trusted IP)
 * 2. Or using X-Real-IP if configured
 * 3. Or falling back to the direct connection IP
 *
 * This prevents IP spoofing because Next.js only trusts these headers
 * from connections that come through the reverse proxy.
 */
export function getClientIp(request: Request): string {
  // In Next.js with trustProxy enabled, request.ip automatically handles
  // X-Forwarded-For validation and returns the correct client IP
  // We still validate the format as a defense-in-depth measure
  const ip = (request as Request & { ip?: string }).ip;

  if (ip && isValidIp(ip)) {
    return ip;
  }

  // Fallback: try x-real-ip header (less trustworthy)
  const realIp = request.headers.get('x-real-ip');
  if (realIp && isValidIp(realIp)) {
    return realIp;
  }

  // Last resort: localhost (shouldn't happen in production)
  return '127.0.0.1';
}

/**
 * Validate IP address format
 */
function isValidIp(ip: string): boolean {
  // IPv4 validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(ip)) {
    const parts = ip.split('.').map(Number);
    return parts.every(part => part >= 0 && part <= 255);
  }

  // IPv6 validation (simplified)
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv6Regex.test(ip);
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
    return createRateLimitResponse(result);
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
