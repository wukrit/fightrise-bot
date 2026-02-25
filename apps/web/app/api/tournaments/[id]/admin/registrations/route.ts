export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma, AdminRole, RegistrationStatus, RegistrationSource, AuditAction, AuditSource } from '@fightrise/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp, createRateLimitHeaders, RATE_LIMIT_CONFIGS } from '@/lib/ratelimit';
import { z } from 'zod';

// Validation schema for creating manual registration
const createRegistrationSchema = z.object({
  discordUsername: z.string().min(1, 'Discord username is required'),
  displayName: z.string().optional(),
});

// Validation schema for filtering
const filterSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'DQ']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

/**
 * GET /api/tournaments/[id]/admin/registrations
 * Get all registrations for a tournament (admin only)
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
        { error: 'Only tournament admins can view registrations' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filterResult = filterSchema.safeParse({
      status: searchParams.get('status') || undefined,
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 20,
    });

    const { status, page, limit } = filterResult.success ? filterResult.data : { page: 1, limit: 20 };
    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const where: { tournamentId: string; status?: RegistrationStatus } = { tournamentId };
    if (status) {
      where.status = status;
    }

    // Get total count for pagination
    const total = await prisma.registration.count({ where });

    // Get paginated registrations
    const registrations = await prisma.registration.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            discordId: true,
            discordUsername: true,
            startggId: true,
            startggGamerTag: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const response = NextResponse.json({
      registrations: registrations.map((r) => ({
        id: r.id,
        user: r.user,
        status: r.status,
        source: r.source,
        createdAt: r.createdAt,
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
    console.error('Admin registrations error:', error);
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

/**
 * POST /api/tournaments/[id]/admin/registrations
 * Create a manual registration (admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(request);
  const result = await checkRateLimit(ip, RATE_LIMIT_CONFIGS.write);

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
    const body = await request.json();

    // Validate input
    const validationResult = createRegistrationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { discordUsername, displayName } = validationResult.data;

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
    const adminUser = await prisma.user.findUnique({
      where: { discordId: session.user.discordId },
    });

    if (!adminUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const adminCheck = await prisma.tournamentAdmin.findFirst({
      where: {
        userId: adminUser.id,
        tournamentId,
        role: { in: [AdminRole.OWNER, AdminRole.ADMIN, AdminRole.MODERATOR] },
      },
    });

    if (!adminCheck) {
      return NextResponse.json(
        { error: 'Only tournament admins can create registrations' },
        { status: 403 }
      );
    }

    // Find user by discord username
    let player = await prisma.user.findFirst({
      where: { discordUsername },
    });

    // If not found, create a new user
    if (!player) {
      player = await prisma.user.create({
        data: {
          discordUsername,
          discordId: `temp_${discordUsername}`, // Temporary ID until linked
          startggGamerTag: displayName || discordUsername,
        },
      });
    }

    // Check for existing registration
    const existingRegistration = await prisma.registration.findFirst({
      where: {
        userId: player.id,
        tournamentId,
      },
    });

    if (existingRegistration) {
      return NextResponse.json(
        { error: 'Player already registered for this tournament' },
        { status: 400 }
      );
    }

    // Create registration with audit log in transaction
    const registration = await prisma.$transaction(async (tx) => {
      // Create registration
      const newRegistration = await tx.registration.create({
        data: {
          userId: player!.id,
          tournamentId,
          source: RegistrationSource.MANUAL,
          status: RegistrationStatus.PENDING, // Manual registrations need approval by default
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: AuditAction.REGISTRATION_MANUAL_ADD,
          entityType: 'Registration',
          entityId: newRegistration.id,
          userId: adminUser.id,
          after: {
            userId: player.id,
            tournamentId,
            status: RegistrationStatus.PENDING,
            source: RegistrationSource.MANUAL,
          },
          source: AuditSource.WEB,
        },
      });

      return newRegistration;
    });

    // Fetch the created registration with user info
    const createdRegistration = await prisma.registration.findUnique({
      where: { id: registration.id },
      include: {
        user: {
          select: {
            id: true,
            discordId: true,
            discordUsername: true,
            startggId: true,
            startggGamerTag: true,
          },
        },
      },
    });

    const response = NextResponse.json({
      success: true,
      registration: {
        id: createdRegistration!.id,
        user: createdRegistration!.user,
        status: createdRegistration!.status,
        source: createdRegistration!.source,
        createdAt: createdRegistration!.createdAt,
      },
    }, { status: 201 });

    // Add rate limit headers
    for (const [key, value] of headers.entries()) {
      response.headers.set(key, value);
    }

    return response;
  } catch (error: unknown) {
    console.error('Admin registration create error:', error);
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
