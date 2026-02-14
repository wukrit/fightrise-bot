import { describe, it, expect, vi } from 'vitest';

// Mock NextAuth
vi.mock('next-auth', () => ({
  __esModule: true,
  default: vi.fn(() => ({ GET: vi.fn(), POST: vi.fn() })),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {
    providers: [],
    session: { strategy: 'jwt' },
  },
}));

describe('NextAuth Route', () => {
  it('should export GET handler', async () => {
    // The route file exports GET and POST handlers
    const route = await import('./route');
    // The route exports GET and POST as handler aliased
    expect(route).toHaveProperty('GET');
    expect(route).toHaveProperty('POST');
  });

  it('should export POST handler', async () => {
    const route = await import('./route');
    expect(route).toHaveProperty('GET');
    expect(route).toHaveProperty('POST');
  });

  it('should have both GET and POST exports', async () => {
    const route = await import('./route');
    expect(route.GET).toBeDefined();
    expect(route.POST).toBeDefined();
  });
});
