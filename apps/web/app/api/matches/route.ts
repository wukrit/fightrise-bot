import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@fightrise/database';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * GET /api/matches
 * Returns matches for the authenticated user
 * Supports both session and API key authentication
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

    // Get matches where user is a player
    const matchPlayers = await prisma.matchPlayer.findMany({
      where: {
        userId: user.id,
      },
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
          createdAt: 'desc',
        },
      },
    });

    // Transform to match details
    const matchDetails = matchPlayers.map((mp) => {
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

    return NextResponse.json(matchDetails);
  } catch (error) {
    console.error('Error fetching matches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch matches' },
      { status: 500 }
    );
  }
}
