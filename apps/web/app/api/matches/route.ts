import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@fightrise/database';
import { getAuthenticatedUser } from '@/lib/auth';

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

/**
 * GET /api/matches
 * Returns matches for the authenticated user with cursor-based pagination
 * Supports both session and API key authentication
 * Query params:
 *   - cursor: The cursor for the next page (match ID)
 *   - limit: Number of results per page (default 10, max 100)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user?.discordId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = Math.min(
      parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10),
      MAX_PAGE_SIZE
    );

    // Build where clause with cursor
    const whereClause: any = {
      userId: user.id,
    };

    if (cursor) {
      whereClause.match = {
        id: {
          lt: cursor,
        },
      };
    }

    // Get matches where user is a player
    const matchPlayers = await prisma.matchPlayer.findMany({
      where: whereClause,
      take: limit + 1, // Fetch one extra to determine if there's a next page
      include: {
        match: {
          include: {
            event: {
              include: {
                tournament: true,
              },
            },
            players: {
              include: {
                user: {
                  select: {
                    id: true,
                    discordId: true,
                    discordUsername: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        match: {
          id: 'desc',
        },
      },
    });

    // Determine if there's a next page
    const hasMore = matchPlayers.length > limit;
    const items = hasMore ? matchPlayers.slice(0, limit) : matchPlayers;
    const nextCursor = hasMore && items.length > 0
      ? items[items.length - 1]?.match.id
      : null;

    // Get total count for metadata
    const total = await prisma.matchPlayer.count({
      where: { userId: user.id },
    });

    // Transform to match details
    const matchDetails = items.map((mp) => {
      const match = mp.match;
      const opponent = match.players.find(
        (p) => p.userId !== user.id
      );

      return {
        id: match.id,
        tournamentId: match.event.tournamentId,
        tournamentName: match.event.tournament.name,
        round: match.round,
        bestOf: 3, // Default, would need to get from bracket
        state: match.state,
        opponent: opponent && opponent.user
          ? {
              id: opponent.user.id,
              name: opponent.user.discordUsername,
              discordId: opponent.user.discordId,
            }
          : null,
        myReportedScore: mp.reportedScore,
        isWinner: mp.isWinner,
      };
    });

    return NextResponse.json({
      items: matchDetails,
      nextCursor,
      hasMore,
      total,
    });
  } catch (error) {
    console.error('Error fetching matches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch matches' },
      { status: 500 }
    );
  }
}
