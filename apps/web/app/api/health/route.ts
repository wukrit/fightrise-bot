export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp, createRateLimitHeaders, RATE_LIMIT_CONFIGS } from "../../../lib/ratelimit";

export async function GET(request: NextRequest) {
  // Skip rate limiting in test environment or when E2E_AUTH_BYPASS is set (for E2E tests)
  const isTestEnv = process.env.NODE_ENV === 'test' || process.env.E2E_AUTH_BYPASS === 'true';
  if (isTestEnv) {
    return NextResponse.json({ status: 'ok' });
  }

  const ip = getClientIp(request);
  const result = await checkRateLimit(ip, RATE_LIMIT_CONFIGS.health);
  const headers = createRateLimitHeaders(result);

  if (!result.allowed) {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers,
    });
  }

  const response = NextResponse.json({ status: "ok" });

  // Add rate limit headers
  for (const [key, value] of headers.entries()) {
    response.headers.set(key, value);
  }

  return response;
}
