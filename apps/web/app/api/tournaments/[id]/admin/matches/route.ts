export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma, MatchState } from '@fightrise/database';
import { requireTournamentAdmin } from '@/lib/tournament-admin';
import { checkRateLimit, getClientIp, createRateLimitHeaders, RATE_LIMIT_CONFIGS } from '@/lib/ratelimit';
import { z } from 'zod';

// Validation schema for filtering matches
const filterSchema = z.object({
  state: z.nativeEnum(MatchState).optional(),
  round: z.coerce.number().int().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  playerName: z.string().optional(),
});

/**
 * GET /api/tournaments/[id]/admin/matches
 * Get all matches for a tournament (admin only)
 * Supports filtering by state, round, player name search
 * Returns paginated results with player info
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
    const { id: tournamentId } = await params;

    // Check authorization using helper
    const authResult = await requireTournamentAdmin(request, tournamentId);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

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

    const { searchParams } = new URL(request.url);
    const filterResult = filterSchema.safeParse({
      state: searchParams.get('state') || undefined,
      round: searchParams.get('round') || undefined,
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 50,
      playerName: searchParams.get('playerName') || undefined,
    });

    const { state, round, page, limit, playerName } = filterResult.success
      ? filterResult.data
      : { page: 1, limit: 50 };
    const skip = (page - 1) * limit;

    // Get event IDs for this tournament
    const events = await prisma.event.findMany({
      where: { tournamentId },
      select: { id: true },
    });
    const eventIds = events.map((e) => e.id);

    if (eventIds.length === 0) {
      return NextResponse.json({
        matches: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    // Build where clause for filtering
    // Note: For filtering by player name in a relation, we use 'some' operator
    // which checks if ANY related player matches the criteria
    // Using type assertion to fix TypeScript inference issue with QueryMode
    const playerNameFilter = playerName
      ? {
          some: {
            OR: [
              { playerName: { contains: playerName, mode: 'insensitive' as const } },
              { user: { discordUsername: { contains: playerName, mode: 'insensitive' as const } } },
              { user: { startggGamerTag: { contains: playerName, mode: 'insensitive' as const } } },
            ],
          },
        }
      : undefined;

    const where: {
      eventId: { in: string[] };
      state?: MatchState;
      round?: number;
      players?: typeof playerNameFilter;
    } = { eventId: { in: eventIds } };

    if (state) {
      where.state = state;
    }

    if (round !== undefined) {
      where.round = round;
    }

    if (playerName) {
      where.players = playerNameFilter;
    }

    // Get total count for pagination
    const total = await prisma.match.count({ where });

    // Get paginated matches with players and event info
    const matches = await prisma.match.findMany({
      where,
      include: {
        event: {
          select: {
            id: true,
            name: true,
            tournamentId: true,
          },
        },
        players: {
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
          orderBy: { id: 'asc' },
        },
      },
      orderBy: [{ round: 'asc' }, { identifier: 'asc' }],
      skip,
      take: limit,
    });

    const response = NextResponse.json({
      matches: matches.map((match) => ({
        id: match.id,
        identifier: match.identifier,
        roundText: match.roundText,
        round: match.round,
        state: match.state,
        checkInDeadline: match.checkInDeadline,
        createdAt: match.createdAt,
        updatedAt: match.updatedAt,
        event: match.event,
        players: match.players.map((player) => ({
          id: player.id,
          playerName: player.playerName,
          isCheckedIn: player.isCheckedIn,
          checkedInAt: player.checkedInAt,
          reportedScore: player.reportedScore,
          isWinner: player.isWinner,
          user: player.user,
        })),
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
    console.error('Admin matches error:', error);
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
