/**
 * Integration tests for tournament registrations API endpoint.
 * Tests GET /api/tournaments/[id]/registrations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock the database
vi.mock('@fightrise/database', async () => {
  const mockPrisma = {
    tournament: {
      findUnique: vi.fn(),
    },
    registration: {
      findMany: vi.fn(),
    },
  };

  return {
    prisma: mockPrisma,
    Registration: {},
  };
});

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/ratelimit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 100, reset: Date.now() + 60000 }),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  createRateLimitHeaders: vi.fn().mockReturnValue(new Headers()),
  RATE_LIMIT_CONFIGS: {
    read: { limit: 100, window: 60 },
    write: { limit: 50, window: 60 },
  },
}));

// Default mock returns valid session
let mockSession: any = {
  user: {
    discordId: 'test-discord-123',
    id: 'test-user-123',
  },
};

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(() => Promise.resolve(mockSession)),
}));

// Helper to set session for tests
function setMockSession(session: any) {
  mockSession = session;
}

const { prisma } = await import('@fightrise/database');
const { getServerSession } = await import('next-auth');

import { GET as registrationsGet } from './route';

describe('GET /api/tournaments/[id]/registrations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMockSession({
      user: {
        discordId: 'test-discord-123',
        id: 'test-user-123',
      },
    });
  });

  it('should return 401 if not authenticated', async () => {
    setMockSession(null);
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/registrations');
    const response = await registrationsGet(request, { params: Promise.resolve({ id: 'tourn-1' }) });

    expect(response.status).toBe(401);
  });

  it('should return registrations for tournament', async () => {
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.registration.findMany).mockResolvedValue([
      {
        id: 'reg-1',
        userId: 'user-1',
        tournamentId: 'tourn-1',
        status: 'CONFIRMED',
        user: {
          id: 'user-1',
          discordId: 'discord-1',
          discordUsername: 'Player1',
          startggGamerTag: 'Player1',
          displayName: 'Player One',
        },
      },
      {
        id: 'reg-2',
        userId: 'user-2',
        tournamentId: 'tourn-1',
        status: 'CONFIRMED',
        user: {
          id: 'user-2',
          discordId: 'discord-2',
          discordUsername: 'Player2',
          startggGamerTag: 'Player2',
          displayName: 'Player Two',
        },
      },
    ] as any);

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/registrations');
    const response = await registrationsGet(request, { params: Promise.resolve({ id: 'tourn-1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);
    expect(data[0].user.discordUsername).toBe('Player1');
  });

  it('should return empty array when no registrations', async () => {
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.registration.findMany).mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/registrations');
    const response = await registrationsGet(request, { params: Promise.resolve({ id: 'tourn-1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(0);
  });

  it('should return 404 for non-existent tournament', async () => {
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/tournaments/non-existent/registrations');
    const response = await registrationsGet(request, { params: Promise.resolve({ id: 'non-existent' }) });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Tournament not found');
  });

  it('should include user data with registration', async () => {
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.registration.findMany).mockResolvedValue([
      {
        id: 'reg-1',
        userId: 'user-1',
        tournamentId: 'tourn-1',
        status: 'CONFIRMED',
        user: {
          id: 'user-1',
          discordId: 'discord-1',
          discordUsername: 'TestPlayer',
          discordAvatar: 'avatar.png',
          startggId: 'startgg-1',
          startggGamerTag: 'TestPlayer',
          displayName: 'Test Player',
        },
      },
    ] as any);

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/registrations');
    const response = await registrationsGet(request, { params: Promise.resolve({ id: 'tourn-1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].user.discordId).toBe('discord-1');
    expect(data[0].user.startggId).toBe('startgg-1');
  });
});
