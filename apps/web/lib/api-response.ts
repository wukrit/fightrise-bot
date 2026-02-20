import { NextResponse } from 'next/server';
import type { RateLimitResult } from './ratelimit';

/**
 * Standardized API error response
 */
export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * HTTP status codes for common error types
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Create a standardized error response
 * @param message - Human-readable error message
 * @param statusCode - HTTP status code
 * @param options - Additional options like error code and details
 */
export function createErrorResponse(
  message: string,
  statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
  options?: {
    code?: string;
    details?: unknown;
    rateLimitHeaders?: Headers;
  }
): NextResponse<ApiError> {
  const body: ApiError = {
    error: message,
  };

  if (options?.code) {
    body.code = options.code;
  }

  if (options?.details) {
    body.details = options.details;
  }

  const response = NextResponse.json(body, { status: statusCode });

  // Add rate limit headers if provided
  if (options?.rateLimitHeaders) {
    for (const [key, value] of options.rateLimitHeaders.entries()) {
      response.headers.set(key, value);
    }
  }

  return response;
}

/**
 * Create a standardized success response
 * @param data - Response data
 * @param statusCode - HTTP status code (default: 200)
 * @param rateLimitHeaders - Optional rate limit headers to add
 */
export function createSuccessResponse<T>(
  data: T,
  statusCode: number = HttpStatus.OK,
  rateLimitHeaders?: Headers
): NextResponse<T> {
  const response = NextResponse.json(data, { status: statusCode });

  if (rateLimitHeaders) {
    for (const [key, value] of rateLimitHeaders.entries()) {
      response.headers.set(key, value);
    }
  }

  return response;
}

/**
 * Create a rate limit error response
 * Uses standardized error format with rate limit headers
 */
export function createRateLimitResponse(rateLimitResult: RateLimitResult): Response {
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
  headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());

  const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
  headers.set('Retry-After', retryAfter.toString());

  const body: ApiError = {
    error: 'Too Many Requests',
    code: 'RATE_LIMITED',
    details: {
      limit: rateLimitResult.limit,
      remaining: 0,
      resetInSeconds: retryAfter,
    },
  };

  return NextResponse.json(body, {
    status: HttpStatus.RATE_LIMITED,
    headers,
  });
}
