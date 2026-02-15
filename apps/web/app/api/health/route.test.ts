import { describe, it, expect } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';

describe('GET /api/health', () => {
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
