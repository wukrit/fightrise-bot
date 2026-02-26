export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@fightrise/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp, createRateLimitHeaders, RATE_LIMIT_CONFIGS } from '@/lib/ratelimit';
import { createErrorResponse, createRateLimitResponse, createSuccessResponse, HttpStatus } from '@/lib/api-response';

/**
 * GET /api/tournaments/[id]/registrations
 * Returns all registrations for a tournament
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

    // Check if tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!tournament) {
      return createErrorResponse('Tournament not found', HttpStatus.NOT_FOUND, { rateLimitHeaders: headers });
    }

    // Get registrations for the tournament
    const registrations = await prisma.registration.findMany({
      where: { tournamentId: id },
      include: {
        user: {
          select: {
            id: true,
            discordId: true,
            discordUsername: true,
            discordAvatar: true,
            startggId: true,
            startggGamerTag: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return createSuccessResponse(registrations, HttpStatus.OK, headers);
  } catch (error) {
    console.error('Error fetching registrations:', error);
    return createErrorResponse('Failed to fetch registrations', HttpStatus.INTERNAL_SERVER_ERROR, { rateLimitHeaders: headers });
  }
}
