/**
 * Integration tests for admin registrations API endpoints.
 * Tests GET, POST /api/tournaments/[id]/admin/registrations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock dependencies
vi.mock('@fightrise/database', async () => {
  const mockPrisma = {
    tournament: {
      findUnique: vi.fn(),
    },
    registration: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(mockPrisma)),
  };

  return {
    prisma: mockPrisma,
    RegistrationStatus: {
      PENDING: 'PENDING',
      CONFIRMED: 'CONFIRMED',
      CANCELLED: 'CANCELLED',
      DQ: 'DQ',
    },
    RegistrationSource: {
      STARTGG: 'STARTGG',
      DISCORD: 'DISCORD',
      MANUAL: 'MANUAL',
    },
    AuditAction: {
      REGISTRATION_MANUAL_ADD: 'REGISTRATION_MANUAL_ADD',
      REGISTRATION_APPROVED: 'REGISTRATION_APPROVED',
      REGISTRATION_REJECTED: 'REGISTRATION_REJECTED',
    },
    AuditSource: {
      WEB: 'WEB',
      API: 'API',
    },
    AdminRole: {
      OWNER: 'OWNER',
      ADMIN: 'ADMIN',
      MODERATOR: 'MODERATOR',
    },
  };
});

vi.mock('@/lib/tournament-admin', () => ({
  requireTournamentAdmin: vi.fn(),
}));

vi.mock('@/lib/admin-rate-limit', () => ({
  withRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    response: null,
    headers: new Headers({}),
  }),
  applyRateLimitHeaders: vi.fn((response) => response),
}));

const { prisma, RegistrationStatus, RegistrationSource, AuditAction, AuditSource } = await import('@fightrise/database');
const { requireTournamentAdmin } = await import('@/lib/tournament-admin');

// Import the route handlers
// We need to re-export them for testing since they're dynamically exported
import { GET as registrationsGet, POST as registrationsPost } from '../../../../tournaments/[id]/admin/registrations/route';

describe('GET /api/tournaments/[id]/admin/registrations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/registrations');
    const response = await registrationsGet(request, { params: Promise.resolve({ id: 'tourn-1' }) });

    expect(response.status).toBe(401);
  });

  it('should return 403 if user is not admin', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue(
      NextResponse.json({ error: 'Only tournament admins can access this resource' }, { status: 403 })
    );

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/registrations');
    const response = await registrationsGet(request, { params: Promise.resolve({ id: 'tourn-1' }) });

    expect(response.status).toBe(403);
  });

  it('should return 404 if tournament not found', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'user-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/registrations');
    const response = await registrationsGet(request, { params: Promise.resolve({ id: 'tourn-1' }) });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Tournament not found');
  });

  it('should return empty array if no registrations exist', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'user-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.registration.count).mockResolvedValue(0);
    vi.mocked(prisma.registration.findMany).mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/registrations');
    const response = await registrationsGet(request, { params: Promise.resolve({ id: 'tourn-1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.registrations).toEqual([]);
    expect(data.pagination.total).toBe(0);
  });

  it('should return paginated registrations', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'user-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.registration.count).mockResolvedValue(2);
    vi.mocked(prisma.registration.findMany).mockResolvedValue([
      {
        id: 'reg-1',
        userId: 'user-1',
        tournamentId: 'tourn-1',
        status: RegistrationStatus.CONFIRMED,
        source: RegistrationSource.STARTGG,
        createdAt: new Date(),
        user: {
          id: 'user-1',
          discordId: '123456',
          discordUsername: 'player1',
          startggId: 'sg-1',
          startggGamerTag: 'Player1',
        },
      },
      {
        id: 'reg-2',
        userId: 'user-2',
        tournamentId: 'tourn-1',
        status: RegistrationStatus.PENDING,
        source: RegistrationSource.MANUAL,
        createdAt: new Date(),
        user: {
          id: 'user-2',
          discordId: '789012',
          discordUsername: 'player2',
          startggId: null,
          startggGamerTag: 'Player2',
        },
      },
    ]);

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/registrations?page=1&limit=20');
    const response = await registrationsGet(request, { params: Promise.resolve({ id: 'tourn-1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.registrations).toHaveLength(2);
    expect(data.pagination.total).toBe(2);
    expect(data.pagination.page).toBe(1);
  });

  it('should filter by status', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'user-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.registration.count).mockResolvedValue(1);
    vi.mocked(prisma.registration.findMany).mockResolvedValue([
      {
        id: 'reg-1',
        userId: 'user-1',
        tournamentId: 'tourn-1',
        status: RegistrationStatus.CONFIRMED,
        source: RegistrationSource.STARTGG,
        createdAt: new Date(),
        user: {
          id: 'user-1',
          discordId: '123456',
          discordUsername: 'player1',
          startggId: 'sg-1',
          startggGamerTag: 'Player1',
        },
      },
    ]);

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/registrations?status=CONFIRMED');
    const response = await registrationsGet(request, { params: Promise.resolve({ id: 'tourn-1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.registrations).toHaveLength(1);
    expect(prisma.registration.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tournamentId: 'tourn-1',
          status: RegistrationStatus.CONFIRMED,
        }),
      })
    );
  });
});

describe('POST /api/tournaments/[id]/admin/registrations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 if validation fails', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'user-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/registrations', {
      method: 'POST',
      body: JSON.stringify({}), // Missing required discordUsername
    });

    const response = await registrationsPost(request, { params: Promise.resolve({ id: 'tourn-1' }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid input');
  });

  it('should create registration for existing user', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'admin-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: 'user-1',
      discordId: '123456',
      discordUsername: 'player1',
      startggGamerTag: 'Player1',
    });
    vi.mocked(prisma.registration.findFirst).mockResolvedValue(null);

    // Mock transaction to return created registration
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      const tx = {
        registration: {
          create: vi.fn().mockResolvedValue({
            id: 'reg-1',
            userId: 'user-1',
            tournamentId: 'tourn-1',
            status: RegistrationStatus.PENDING,
            source: RegistrationSource.MANUAL,
            createdAt: new Date(),
          }),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({}),
        },
      };
      return callback(tx);
    });

    vi.mocked(prisma.registration.findUnique).mockResolvedValue({
      id: 'reg-1',
      userId: 'user-1',
      tournamentId: 'tourn-1',
      status: RegistrationStatus.PENDING,
      source: RegistrationSource.MANUAL,
      createdAt: new Date(),
      user: {
        id: 'user-1',
        discordId: '123456',
        discordUsername: 'player1',
        startggId: null,
        startggGamerTag: 'Player1',
      },
    });

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/registrations', {
      method: 'POST',
      body: JSON.stringify({ discordUsername: 'player1', displayName: 'Player One' }),
    });

    const response = await registrationsPost(request, { params: Promise.resolve({ id: 'tourn-1' }) });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.registration).toBeDefined();
  });

  it('should return 400 if player already registered', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'admin-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: 'user-1',
      discordId: '123456',
      discordUsername: 'player1',
      startggGamerTag: 'Player1',
    });
    vi.mocked(prisma.registration.findFirst).mockResolvedValue({
      id: 'existing-reg',
      userId: 'user-1',
      tournamentId: 'tourn-1',
      status: RegistrationStatus.CONFIRMED,
      source: RegistrationSource.STARTGG,
    });

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/registrations', {
      method: 'POST',
      body: JSON.stringify({ discordUsername: 'player1' }),
    });

    const response = await registrationsPost(request, { params: Promise.resolve({ id: 'tourn-1' }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('already registered');
  });

  it('should create new user if not found', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'admin-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null); // User not found
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'new-user-1',
      discordId: 'temp_player1',
      discordUsername: 'player1',
      startggGamerTag: 'Player One',
    });
    vi.mocked(prisma.registration.findFirst).mockResolvedValue(null);

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      const tx = {
        registration: {
          create: vi.fn().mockResolvedValue({
            id: 'reg-1',
            userId: 'new-user-1',
            tournamentId: 'tourn-1',
            status: RegistrationStatus.PENDING,
            source: RegistrationSource.MANUAL,
            createdAt: new Date(),
          }),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({}),
        },
      };
      return callback(tx);
    });

    vi.mocked(prisma.registration.findUnique).mockResolvedValue({
      id: 'reg-1',
      userId: 'new-user-1',
      tournamentId: 'tourn-1',
      status: RegistrationStatus.PENDING,
      source: RegistrationSource.MANUAL,
      createdAt: new Date(),
      user: {
        id: 'new-user-1',
        discordId: 'temp_player1',
        discordUsername: 'player1',
        startggId: null,
        startggGamerTag: 'Player One',
      },
    });

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/registrations', {
      method: 'POST',
      body: JSON.stringify({ discordUsername: 'player1', displayName: 'Player One' }),
    });

    const response = await registrationsPost(request, { params: Promise.resolve({ id: 'tourn-1' }) });

    expect(response.status).toBe(201);
    expect(prisma.user.create).toHaveBeenCalled();
  });
});
