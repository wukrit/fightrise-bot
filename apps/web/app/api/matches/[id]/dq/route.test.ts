/**
 * Integration tests for match DQ (disqualification) API endpoint.
 * Uses mocked Prisma client (like other API tests in this project).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock @/lib/api-response BEFORE importing the route
vi.mock('@/lib/api-response', () => ({
  createErrorResponse: vi.fn((message, status, options) => {
    return NextResponse.json({ error: message }, { status, headers: options?.rateLimitHeaders || {} });
  }),
  createRateLimitResponse: vi.fn((result) => {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429, headers: result.headers || {} });
  }),
  createSuccessResponse: vi.fn((data, status, headers) => {
    return NextResponse.json(data, { status: status || 200, headers: headers || {} });
  }),
  HttpStatus: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
  },
}));

// Mock dependencies BEFORE importing the route
vi.mock('@fightrise/database', async () => {
  const mockPrisma = {
    match: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    matchPlayer: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  return {
    prisma: mockPrisma,
    default: mockPrisma,
    MatchState: {
      NOT_STARTED: 'NOT_STARTED',
      CALLED: 'CALLED',
      CHECKED_IN: 'CHECKED_IN',
      IN_PROGRESS: 'IN_PROGRESS',
      PENDING_CONFIRMATION: 'PENDING_CONFIRMATION',
      COMPLETED: 'COMPLETED',
      DISPUTED: 'DISPUTED',
      DQ: 'DQ',
    },
    AuditAction: {
      PLAYER_DQ: 'PLAYER_DQ',
    },
    AuditSource: {
      API: 'API',
    },
    AdminRole: {
      OWNER: 'OWNER',
      ADMIN: 'ADMIN',
      MODERATOR: 'MODERATOR',
    },
  };
});

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/ratelimit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 100, reset: Date.now() + 60000, headers: new Headers() }),
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  createRateLimitHeaders: vi.fn().mockReturnValue(new Headers()),
  RATE_LIMIT_CONFIGS: {
    read: { limit: 100, window: 60 },
    write: { limit: 50, window: 60 },
  },
}));

// Mock next-auth
const mockSession = {
  user: {
    discordId: 'test-discord-123',
    id: 'test-user-123',
  },
};

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(() => Promise.resolve(mockSession)),
}));

// Static import for proper module resolution in vitest
import { POST as dqPlayer } from './route';

// Get the mocked prisma after mocks are set up
const { prisma } = await import('@fightrise/database');

describe('POST /api/matches/[id]/dq - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock for $transaction to just run the callback
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return callback(prisma);
    });
  });

  it('should return 404 for non-existent match', async () => {
    vi.mocked(prisma.match.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/matches/non-existent/dq', {
      method: 'POST',
      body: JSON.stringify({
        playerId: 'player-1',
        reason: 'Test DQ',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await dqPlayer(request, { params: Promise.resolve({ id: 'non-existent' }) });

    expect(response.status).toBe(404);
  });
});
