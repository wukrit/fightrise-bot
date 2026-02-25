/**
 * Integration tests for admin registration PATCH API endpoint.
 * Tests PATCH, DELETE /api/tournaments/[id]/admin/registrations/[registrationId]
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
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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
      REGISTRATION_APPROVED: 'REGISTRATION_APPROVED',
      REGISTRATION_REJECTED: 'REGISTRATION_REJECTED',
      REGISTRATION_MANUAL_ADD: 'REGISTRATION_MANUAL_ADD',
      REGISTRATION_MANUAL_REMOVE: 'REGISTRATION_MANUAL_REMOVE',
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

const { prisma, RegistrationStatus, AuditAction, AuditSource } = await import('@fightrise/database');
const { requireTournamentAdmin } = await import('@/lib/tournament-admin');

import { PATCH as registrationPatch, DELETE as registrationDelete } from './route';

describe('PATCH /api/tournaments/[id]/admin/registrations/[registrationId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/registrations/reg-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'approve' }),
    });
    const response = await registrationPatch(request, { params: Promise.resolve({ id: 'tourn-1', registrationId: 'reg-1' }) });

    expect(response.status).toBe(401);
  });

  it('should return 400 if action is missing', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'user-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/registrations/reg-1', {
      method: 'PATCH',
      body: JSON.stringify({}), // Missing action
    });
    const response = await registrationPatch(request, { params: Promise.resolve({ id: 'tourn-1', registrationId: 'reg-1' }) });

    expect(response.status).toBe(400);
  });

  it('should return 400 if reject without reason', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'user-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.registration.findUnique).mockResolvedValue({
      id: 'reg-1',
      userId: 'user-1',
      tournamentId: 'tourn-1',
      status: RegistrationStatus.PENDING,
      source: 'STARTGG',
      createdAt: new Date(),
      user: {
        id: 'user-1',
        discordId: '123456',
        discordUsername: 'player1',
        startggGamerTag: 'Player1',
      },
    });

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/registrations/reg-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'reject' }), // Missing reason
    });
    const response = await registrationPatch(request, { params: Promise.resolve({ id: 'tourn-1', registrationId: 'reg-1' }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Reason is required');
  });

  it('should return 404 if tournament not found', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'user-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/registrations/reg-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'approve' }),
    });
    const response = await registrationPatch(request, { params: Promise.resolve({ id: 'tourn-1', registrationId: 'reg-1' }) });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Tournament not found');
  });

  it('should return 404 if registration not found', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'user-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.registration.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/registrations/reg-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'approve' }),
    });
    const response = await registrationPatch(request, { params: Promise.resolve({ id: 'tourn-1', registrationId: 'reg-1' }) });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Registration not found');
  });

  it('should approve registration successfully', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'admin-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.registration.findUnique).mockResolvedValue({
      id: 'reg-1',
      userId: 'user-1',
      tournamentId: 'tourn-1',
      status: RegistrationStatus.PENDING,
      source: 'STARTGG',
      createdAt: new Date(),
      user: {
        id: 'user-1',
        discordId: '123456',
        discordUsername: 'player1',
        startggGamerTag: 'Player1',
      },
    });

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      const tx = {
        registration: {
          update: vi.fn().mockResolvedValue({
            id: 'reg-1',
            userId: 'user-1',
            tournamentId: 'tourn-1',
            status: RegistrationStatus.CONFIRMED,
            updatedAt: new Date(),
          }),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({}),
        },
      };
      return callback(tx);
    });

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/registrations/reg-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'approve' }),
    });
    const response = await registrationPatch(request, { params: Promise.resolve({ id: 'tourn-1', registrationId: 'reg-1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.registration.status).toBe(RegistrationStatus.CONFIRMED);
  });

  it('should reject registration successfully', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'admin-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.registration.findUnique).mockResolvedValue({
      id: 'reg-1',
      userId: 'user-1',
      tournamentId: 'tourn-1',
      status: RegistrationStatus.PENDING,
      source: 'STARTGG',
      createdAt: new Date(),
      user: {
        id: 'user-1',
        discordId: '123456',
        discordUsername: 'player1',
        startggGamerTag: 'Player1',
      },
    });

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      const tx = {
        registration: {
          update: vi.fn().mockResolvedValue({
            id: 'reg-1',
            userId: 'user-1',
            tournamentId: 'tourn-1',
            status: RegistrationStatus.CANCELLED,
            updatedAt: new Date(),
          }),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({}),
        },
      };
      return callback(tx);
    });

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/registrations/reg-1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'reject', reason: 'Did not show up' }),
    });
    const response = await registrationPatch(request, { params: Promise.resolve({ id: 'tourn-1', registrationId: 'reg-1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.registration.status).toBe(RegistrationStatus.CANCELLED);
  });
});

describe('DELETE /api/tournaments/[id]/admin/registrations/[registrationId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete registration successfully', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'admin-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.registration.findUnique).mockResolvedValue({
      id: 'reg-1',
      userId: 'user-1',
      tournamentId: 'tourn-1',
      status: RegistrationStatus.PENDING,
      source: 'MANUAL',
    });

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      const tx = {
        registration: {
          delete: vi.fn().mockResolvedValue({}),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({}),
        },
      };
      return callback(tx);
    });

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/registrations/reg-1', {
      method: 'DELETE',
    });
    const response = await registrationDelete(request, { params: Promise.resolve({ id: 'tourn-1', registrationId: 'reg-1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain('deleted');
  });

  it('should return 404 if registration belongs to different tournament (IDOR)', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'admin-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.registration.findUnique).mockResolvedValue({
      id: 'reg-1',
      userId: 'user-1',
      tournamentId: 'different-tourn', // Different tournament!
      status: RegistrationStatus.PENDING,
      source: 'MANUAL',
    });

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/registrations/reg-1', {
      method: 'DELETE',
    });
    const response = await registrationDelete(request, { params: Promise.resolve({ id: 'tourn-1', registrationId: 'reg-1' }) });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Registration not found');
  });
});
