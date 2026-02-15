import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp, createRateLimitHeaders, RATE_LIMIT_CONFIGS } from "../../../lib/ratelimit";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const result = checkRateLimit(ip, RATE_LIMIT_CONFIGS.health);
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
