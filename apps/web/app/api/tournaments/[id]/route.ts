import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@fightrise/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp, createRateLimitHeaders, RATE_LIMIT_CONFIGS } from '@/lib/ratelimit';
import { createErrorResponse, createRateLimitResponse, createSuccessResponse, HttpStatus } from '@/lib/api-response';

/**
 * GET /api/tournaments/[id]
 * Returns a single tournament by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(request);
  const result = await checkRateLimit(ip, RATE_LIMIT_CONFIGS.read);

  const headers = createRateLimitHeaders(result);
  if (!result.allowed) {
    return createRateLimitResponse(result);
  }

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.discordId) {
      return createErrorResponse('Unauthorized', HttpStatus.UNAUTHORIZED, { rateLimitHeaders: headers });
    }

    const { id } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        events: true,
        _count: {
          select: { registrations: true },
        },
      },
    });

    if (!tournament) {
      return createErrorResponse('Tournament not found', HttpStatus.NOT_FOUND, { rateLimitHeaders: headers });
    }

    return createSuccessResponse(tournament, HttpStatus.OK, headers);
  } catch (error) {
    console.error('Error fetching tournament:', error);
    return createErrorResponse('Failed to fetch tournament', HttpStatus.INTERNAL_SERVER_ERROR, { rateLimitHeaders: headers });
  }
}

/**
 * PUT /api/tournaments/[id]
 * Updates tournament settings
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(request);
  const result = await checkRateLimit(ip, RATE_LIMIT_CONFIGS.write);

  const headers = createRateLimitHeaders(result);
  if (!result.allowed) {
    return createRateLimitResponse(result);
  }

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.discordId) {
      return createErrorResponse('Unauthorized', HttpStatus.UNAUTHORIZED, { rateLimitHeaders: headers });
    }

    const { id } = await params;
    const body = await request.json();

    // Check if user is admin of this tournament
    const admin = await prisma.tournamentAdmin.findFirst({
      where: {
        tournamentId: id,
        user: { discordId: session.user.discordId },
      },
    });

    if (!admin) {
      return createErrorResponse('Forbidden', HttpStatus.FORBIDDEN, { rateLimitHeaders: headers });
    }

    // Update tournament settings
    const tournament = await prisma.tournament.update({
      where: { id },
      data: {
        discordGuildId: body.discordGuildId,
        discordChannelId: body.discordChannelId,
        settings: {
          autoCreateThreads: body.autoCreateThreads,
          requireCheckIn: body.requireCheckIn,
          checkInWindowMinutes: body.checkInWindowMinutes,
          allowSelfReporting: body.allowSelfReporting,
        },
      },
    });

    return createSuccessResponse(tournament, HttpStatus.OK, headers);
  } catch (error) {
    console.error('Error updating tournament:', error);
    return createErrorResponse('Failed to update tournament', HttpStatus.INTERNAL_SERVER_ERROR, { rateLimitHeaders: headers });
  }
}
