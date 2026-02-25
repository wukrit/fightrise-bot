import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, createRateLimitHeaders, RATE_LIMIT_CONFIGS } from './ratelimit';

/**
 * Configuration for different admin rate limit types
 */
export type AdminRateLimitType = 'admin' | 'write';

/**
 * Applies rate limiting to an admin API route.
 * Returns either a response (if rate limited) or null (if allowed).
 *
 * @param request - The Next.js request object
 * @param type - The type of rate limit to apply ('admin' or 'write')
 * @returns The rate limit response if not allowed, or null if allowed
 */
export async function withRateLimit(
  request: NextRequest,
  type: AdminRateLimitType = 'admin'
) {
  const config = type === 'admin' ? RATE_LIMIT_CONFIGS.admin : RATE_LIMIT_CONFIGS.write;
  const ip = getClientIp(request);
  const result = await checkRateLimit(ip, config);
  const headers = createRateLimitHeaders(result);

  if (!result.allowed) {
    const response = new Response('Too Many Requests', {
      status: 429,
      headers,
    });
    return {
      allowed: false,
      response,
      headers,
    };
  }

  return {
    allowed: true,
    response: null,
    headers,
  };
}

/**
 * Applies rate limit headers to a response
 */
export function applyRateLimitHeaders(
  response: NextResponse,
  headers: Headers
): NextResponse {
  for (const [key, value] of headers.entries()) {
    response.headers.set(key, value);
  }
  return response;
}
