/**
 * Simple in-memory rate limiter
 * Suitable for single-instance deployments; use Upstash Redis for serverless/multi-instance
 */

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

// Simple Map-based rate limiter (no external dependencies)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

/**
 * Check rate limit for a given key
 * @param key - Identifier (usually IP address)
 * @param config - Rate limit configuration
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // New window
    const resetTime = now + config.windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return {
      allowed: true,
      limit: config.limit,
      remaining: config.limit - 1,
      resetTime,
    };
  }

  if (entry.count >= config.limit) {
    // Rate limit exceeded
    return {
      allowed: false,
      limit: config.limit,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    resetTime: entry.resetTime,
  };
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
  const result = checkRateLimit(ip, config);
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
