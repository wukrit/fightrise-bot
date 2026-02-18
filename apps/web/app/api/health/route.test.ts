import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';

vi.mock('../../../lib/ratelimit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 100, reset: Date.now() + 60000 }),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  createRateLimitHeaders: vi.fn().mockReturnValue(new Headers({
    'X-RateLimit-Limit': '100',
    'X-RateLimit-Remaining': '99',
    'X-RateLimit-Reset': String(Date.now() + 60000),
  })),
  RATE_LIMIT_CONFIGS: {
    health: { limit: 100, windowMs: 60000 },
  },
}));

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return status ok', async () => {
    const request = new NextRequest('http://localhost:3000/api/health');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ status: 'ok' });
  });

  it('should return JSON content type', async () => {
    const request = new NextRequest('http://localhost:3000/api/health');
    const response = await GET(request);
    const contentType = response.headers.get('content-type');

    expect(contentType).toContain('application/json');
  });

  it('should include rate limit headers', async () => {
    const request = new NextRequest('http://localhost:3000/api/health');
    const response = await GET(request);

    expect(response.headers.has('X-RateLimit-Limit')).toBe(true);
    expect(response.headers.has('X-RateLimit-Remaining')).toBe(true);
    expect(response.headers.has('X-RateLimit-Reset')).toBe(true);
  });
});
