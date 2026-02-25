export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma, AdminRole, AuditAction } from '@fightrise/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp, createRateLimitHeaders, RATE_LIMIT_CONFIGS } from '@/lib/ratelimit';
import { z } from 'zod';

// Registration-related audit actions to filter by
const REGISTRATION_ACTIONS = [
  AuditAction.REGISTRATION_APPROVED,
  AuditAction.REGISTRATION_REJECTED,
  AuditAction.REGISTRATION_MANUAL_ADD,
  AuditAction.REGISTRATION_MANUAL_REMOVE,
];

// Validation schema for filtering
const filterSchema = z.object({
  action: z.enum(['REGISTRATION_APPROVED', 'REGISTRATION_REJECTED', 'REGISTRATION_MANUAL_ADD', 'REGISTRATION_MANUAL_REMOVE']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

/**
 * GET /api/tournaments/[id]/admin/audit
 * Get audit logs for a tournament (admin only)
 * Supports filtering by registration-related actions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(request);
  const result = await checkRateLimit(ip, RATE_LIMIT_CONFIGS.admin);

  const headers = createRateLimitHeaders(result);
  if (!result.allowed) {
    return new Response('Too Many Requests', {
      status: 429,
      headers,
    });
  }

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.discordId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: tournamentId } = await params;

    // Find the tournament
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { discordId: session.user.discordId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const adminCheck = await prisma.tournamentAdmin.findFirst({
      where: {
        userId: user.id,
        tournamentId,
        role: { in: [AdminRole.OWNER, AdminRole.ADMIN, AdminRole.MODERATOR] },
      },
    });

    if (!adminCheck) {
      return NextResponse.json(
        { error: 'Only tournament admins can view audit logs' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filterResult = filterSchema.safeParse({
      action: searchParams.get('action') || undefined,
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 20,
    });

    const { action, page, limit } = filterResult.success ? filterResult.data : { page: 1, limit: 20 };
    const skip = (page - 1) * limit;

    // Build where clause for filtering
    // Only allow registration-related actions for security
    // Filter by tournamentId through the Registration entity
    const where: Record<string, unknown> = {
      action: { in: REGISTRATION_ACTIONS },
      entityType: 'Registration',
    };

    // If specific action filter is provided, verify it's a valid registration action
    if (action && !REGISTRATION_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action filter. Must be a registration-related action.' },
        { status: 400 }
      );
    }

    if (action) {
      where.action = action;
    }

    // Filter audit logs by tournament - use Prisma's some for nested filtering
    // This filters to only show registrations belonging to this tournament
    where.entityId = {
      in: await prisma.registration
        .findMany({
          where: { tournamentId },
          select: { id: true },
        })
        .then((regs) => regs.map((r) => r.id)),
    };

    // Get total count for pagination
    const total = await prisma.auditLog.count({ where });

    // Get paginated audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            discordUsername: true,
            startggGamerTag: true,
          },
        },
      },
    });

    const response = NextResponse.json({
      auditLogs: auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        user: log.user,
        before: log.before,
        after: log.after,
        reason: log.reason,
        source: log.source,
        createdAt: log.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

    // Add rate limit headers
    for (const [key, value] of headers.entries()) {
      response.headers.set(key, value);
    }

    return response;
  } catch (error: unknown) {
    console.error('Admin audit logs error:', error);
    const errorResponse = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    for (const [key, value] of headers.entries()) {
      errorResponse.headers.set(key, value);
    }
    return errorResponse;
  }
}
