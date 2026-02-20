import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  checkRateLimit,
  getClientIp,
  getConnectionIpFromRequest,
  createRateLimitHeaders,
  RATE_LIMIT_CONFIGS,
} from '@/lib/ratelimit';

const handler = NextAuth(authOptions);

export async function GET(request: Request) {
  const ip = getClientIp(request, getConnectionIpFromRequest(request));
  const result = await checkRateLimit(ip, RATE_LIMIT_CONFIGS.auth);

  if (!result.allowed) {
    const headers = createRateLimitHeaders(result);
    return new Response('Too Many Requests', {
      status: 429,
      headers,
    });
  }

  const response = await handler(request);

  // Add rate limit headers
  const headers = createRateLimitHeaders(result);
  for (const [key, value] of headers.entries()) {
    response.headers.set(key, value);
  }

  return response;
}

export async function POST(request: Request) {
  const ip = getClientIp(request, getConnectionIpFromRequest(request));
  const result = await checkRateLimit(ip, RATE_LIMIT_CONFIGS.auth);

  if (!result.allowed) {
    const headers = createRateLimitHeaders(result);
    return new Response('Too Many Requests', {
      status: 429,
      headers,
    });
  }

  const response = await handler(request);

  // Add rate limit headers
  const headers = createRateLimitHeaders(result);
  for (const [key, value] of headers.entries()) {
    response.headers.set(key, value);
  }

  return response;
}
