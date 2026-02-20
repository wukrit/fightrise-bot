import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createSignedStartggOAuthState } from '@fightrise/shared';

const mockConsumeNonce = vi.fn();

vi.mock('@/lib/startggStateStore', () => ({
  consumeStartggOAuthNonce: (...args: unknown[]) => mockConsumeNonce(...args),
}));

vi.mock('@fightrise/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('GET /api/auth/callback/startgg', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsumeNonce.mockResolvedValue(true);
    process.env.NEXTAUTH_SECRET = 'test-nextauth-secret-at-least-32-chars';
  });

  it('rejects unsigned/invalid state', async () => {
    const route = await import('./route');
    const request = new NextRequest(
      'http://localhost:3000/api/auth/callback/startgg?code=abc&state=unsigned_payload'
    );

    const response = await route.GET(request);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/auth/error?error=invalid_state');
  });

  it('rejects replayed state nonce', async () => {
    mockConsumeNonce.mockResolvedValue(false);
    const route = await import('./route');
    const state = createSignedStartggOAuthState({
      discordId: '123456789012345678',
      discordUsername: 'test-user',
      ttlSeconds: 600,
    });
    const request = new NextRequest(
      `http://localhost:3000/api/auth/callback/startgg?code=abc&state=${encodeURIComponent(state)}`
    );

    const response = await route.GET(request);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/auth/error?error=invalid_state');
  });
});
