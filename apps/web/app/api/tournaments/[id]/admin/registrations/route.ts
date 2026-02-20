import { NextRequest, NextResponse } from 'next/server';
import { prisma, AdminRole } from '@fightrise/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp, createRateLimitHeaders, RATE_LIMIT_CONFIGS } from '@/lib/ratelimit';

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

    // Get all registrations
    const registrations = await prisma.registration.findMany({
      where: { tournamentId },
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
    });

    const response = NextResponse.json({
      registrations: registrations.map((r) => ({
        id: r.id,
        user: r.user,
        status: r.status,
        source: r.source,
        createdAt: r.createdAt,
      })),
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
