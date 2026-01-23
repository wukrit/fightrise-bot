import { describe, it, expect } from 'vitest';
import { GET } from './route';

describe('GET /api/health', () => {
  it('should return status ok', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ status: 'ok' });
  });

  it('should return JSON content type', async () => {
    const response = await GET();
    const contentType = response.headers.get('content-type');

    expect(contentType).toContain('application/json');
  });
});
