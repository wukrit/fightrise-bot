/**
 * Integration tests for admin audit API endpoint.
 * Tests GET /api/tournaments/[id]/admin/audit
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
    },
    auditLog: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(mockPrisma)),
  };

  return {
    prisma: mockPrisma,
    AuditAction: {
      REGISTRATION_APPROVED: 'REGISTRATION_APPROVED',
      REGISTRATION_REJECTED: 'REGISTRATION_REJECTED',
      REGISTRATION_MANUAL_ADD: 'REGISTRATION_MANUAL_ADD',
      REGISTRATION_MANUAL_REMOVE: 'REGISTRATION_MANUAL_REMOVE',
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

const { prisma, AuditAction } = await import('@fightrise/database');
const { requireTournamentAdmin } = await import('@/lib/tournament-admin');

import { GET as auditGet } from '../../../../tournaments/[id]/admin/audit/route';

describe('GET /api/tournaments/[id]/admin/audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/audit');
    const response = await auditGet(request, { params: Promise.resolve({ id: 'tourn-1' }) });

    expect(response.status).toBe(401);
  });

  it('should return 403 if user is not admin', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue(
      NextResponse.json({ error: 'Only tournament admins can access this resource' }, { status: 403 })
    );

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/audit');
    const response = await auditGet(request, { params: Promise.resolve({ id: 'tourn-1' }) });

    expect(response.status).toBe(403);
  });

  it('should return 404 if tournament not found', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'user-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/audit');
    const response = await auditGet(request, { params: Promise.resolve({ id: 'tourn-1' }) });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Tournament not found');
  });

  it.skip('should return 400 if action filter is invalid', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'user-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.registration.findMany).mockResolvedValue(Promise.resolve([]));

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/audit?action=INVALID_ACTION');
    const response = await auditGet(request, { params: Promise.resolve({ id: 'tourn-1' }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Invalid action filter');
  });

  it.skip('should return empty array if no registrations exist', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'user-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.registration.findMany).mockResolvedValue(Promise.resolve([]));

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/audit');
    const response = await auditGet(request, { params: Promise.resolve({ id: 'tourn-1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.auditLogs).toEqual([]);
    expect(data.pagination.total).toBe(0);
  });

  it('should return paginated audit logs', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'user-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.registration.findMany).mockResolvedValue([
      { id: 'reg-1' },
      { id: 'reg-2' },
    ]);
    vi.mocked(prisma.auditLog.count).mockResolvedValue(2);
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
      {
        id: 'log-1',
        action: AuditAction.REGISTRATION_APPROVED,
        entityType: 'Registration',
        entityId: 'reg-1',
        userId: 'admin-1',
        before: { status: 'PENDING' },
        after: { status: 'CONFIRMED' },
        reason: null,
        source: 'WEB',
        createdAt: new Date(),
        user: {
          id: 'admin-1',
          discordUsername: 'admin',
          startggGamerTag: 'Admin',
        },
      },
      {
        id: 'log-2',
        action: AuditAction.REGISTRATION_REJECTED,
        entityType: 'Registration',
        entityId: 'reg-2',
        userId: 'admin-1',
        before: { status: 'PENDING' },
        after: { status: 'CANCELLED' },
        reason: 'No show',
        source: 'WEB',
        createdAt: new Date(),
        user: {
          id: 'admin-1',
          discordUsername: 'admin',
          startggGamerTag: 'Admin',
        },
      },
    ]);

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/audit?page=1&limit=20');
    const response = await auditGet(request, { params: Promise.resolve({ id: 'tourn-1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.auditLogs).toHaveLength(2);
    expect(data.pagination.total).toBe(2);
  });

  it('should filter by action type', async () => {
    vi.mocked(requireTournamentAdmin).mockResolvedValue({
      userId: 'user-1',
      role: 'ADMIN' as const,
      isAdmin: true,
    });
    vi.mocked(prisma.tournament.findUnique).mockResolvedValue({ id: 'tourn-1' });
    vi.mocked(prisma.registration.findMany).mockResolvedValue([
      { id: 'reg-1' },
    ]);
    vi.mocked(prisma.auditLog.count).mockResolvedValue(1);
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
      {
        id: 'log-1',
        action: AuditAction.REGISTRATION_APPROVED,
        entityType: 'Registration',
        entityId: 'reg-1',
        userId: 'admin-1',
        before: { status: 'PENDING' },
        after: { status: 'CONFIRMED' },
        reason: null,
        source: 'WEB',
        createdAt: new Date(),
        user: {
          id: 'admin-1',
          discordUsername: 'admin',
          startggGamerTag: 'Admin',
        },
      },
    ]);

    const request = new NextRequest('http://localhost/api/tournaments/tourn-1/admin/audit?action=REGISTRATION_APPROVED');
    const response = await auditGet(request, { params: Promise.resolve({ id: 'tourn-1' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.auditLogs).toHaveLength(1);
    expect(data.auditLogs[0].action).toBe(AuditAction.REGISTRATION_APPROVED);
  });
});
