import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockHandler = vi.fn();

vi.mock('next-auth', () => ({
  __esModule: true,
  default: vi.fn(() => mockHandler),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {
    providers: [],
    session: { strategy: 'jwt' },
  },
}));

const mockCheckRateLimit = vi.fn();
const mockGetClientIp = vi.fn();
const mockGetConnectionIpFromRequest = vi.fn();
const mockCreateRateLimitHeaders = vi.fn();

vi.mock('@/lib/ratelimit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIp: (...args: unknown[]) => mockGetClientIp(...args),
  getConnectionIpFromRequest: (...args: unknown[]) => mockGetConnectionIpFromRequest(...args),
  createRateLimitHeaders: (...args: unknown[]) => mockCreateRateLimitHeaders(...args),
  RATE_LIMIT_CONFIGS: {
    auth: { limit: 5, windowMs: 60000 },
  },
}));

describe('NextAuth rate-limited route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClientIp.mockReturnValue('127.0.0.1');
    mockGetConnectionIpFromRequest.mockReturnValue(undefined);
    mockCreateRateLimitHeaders.mockReturnValue(new Headers({ 'X-RateLimit-Limit': '5' }));
  });

  it('adds headers and returns GET handler response', async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: true, limit: 5, remaining: 4, resetTime: Date.now() + 1000 });
    const handlerResponse = new Response('ok', { status: 200 });
    mockHandler.mockResolvedValue(handlerResponse);

    const route = await import('./route');
    const response = await route.GET(new Request('http://localhost:3000/api/auth/signin'));

    expect(response.status).toBe(200);
    expect(response.headers.get('X-RateLimit-Limit')).toBe('5');
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  it('returns 429 when over rate limit', async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, limit: 5, remaining: 0, resetTime: Date.now() + 1000 });
    mockHandler.mockResolvedValue(new Response('ok', { status: 200 }));

    const route = await import('./route');
    const response = await route.GET(new Request('http://localhost:3000/api/auth/signin'));

    expect(response.status).toBe(429);
    expect(mockHandler).not.toHaveBeenCalled();
  });
});
