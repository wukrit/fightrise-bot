export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@fightrise/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp, createRateLimitHeaders, RATE_LIMIT_CONFIGS } from '@/lib/ratelimit';
import { createErrorResponse, createRateLimitResponse, createSuccessResponse, HttpStatus } from '@/lib/api-response';

/**
 * GET /api/tournaments/[id]/matches
 * Returns all matches for a tournament
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
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');

    // Check if tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!tournament) {
      return createErrorResponse('Tournament not found', HttpStatus.NOT_FOUND, { rateLimitHeaders: headers });
    }

    // Build the query
    const where: any = {
      event: {
        tournamentId: id,
      },
    };

    // Filter by state if provided
    if (state) {
      where.state = state;
    }

    // Get matches for the tournament
    const matches = await prisma.match.findMany({
      where,
      include: {
        event: {
          select: {
            id: true,
            name: true,
          },
        },
        players: {
          include: {
            user: {
              select: {
                id: true,
                discordId: true,
                discordUsername: true,
                startggGamerTag: true,
                displayName: true,
              },
            },
          },
        },
      },
      orderBy: { round: 'asc' },
    });

    return createSuccessResponse(matches, HttpStatus.OK, headers);
  } catch (error) {
    console.error('Error fetching matches:', error);
    return createErrorResponse('Failed to fetch matches', HttpStatus.INTERNAL_SERVER_ERROR, { rateLimitHeaders: headers });
  }
}
