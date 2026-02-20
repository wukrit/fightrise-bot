import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@fightrise/database';

/**
 * GET /api/user/matches
 * Returns the current user's match history
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.discordId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { discordId: session.user.discordId },
    });

    if (!user) {
      return NextResponse.json({ matches: [] });
    }

    // Get matches where user is a participant
    const matchPlayers = await prisma.matchPlayer.findMany({
      where: { userId: user.id },
      include: {
        match: {
          include: {
            event: {
              include: {
                tournament: true,
              },
            },
          },
        },
      },
      orderBy: {
        match: {
          updatedAt: 'desc',
        },
      },
      take: 20,
    });

    const matches = await Promise.all(
      matchPlayers.map(async (mp) => {
        // Get opponent(s)
        const opponents = await prisma.matchPlayer.findMany({
          where: {
            matchId: mp.matchId,
            userId: { not: user.id },
          },
          include: {
            user: true,
          },
        });

        const opponent = opponents[0]?.user?.discordUsername || 'Unknown';
        const opponentStartgg = opponents[0]?.user?.startggGamerTag || opponent;

        // Determine result
        let result: 'win' | 'loss' | 'pending' = 'pending';
        if (mp.match.state === 'COMPLETED') {
          result = mp.isWinner ? 'win' : 'loss';
        }

        // Get score
        let score = '-';
        if (mp.match.state === 'COMPLETED') {
          const playerScore = mp.reportedScore || 0;
          const opponentScore = opponents[0]?.reportedScore || 0;
          score = `${playerScore}-${opponentScore}`;
        }

        return {
          id: mp.match.id,
          opponent: opponentStartgg,
          result,
          score,
          date: mp.match.updatedAt ? mp.match.updatedAt.toISOString().split('T')[0] : '',
          tournamentName: mp.match.event?.tournament?.name || 'Unknown Tournament',
        };
      })
    );

    return NextResponse.json({ matches });
  } catch (error) {
    console.error('Error fetching user matches:', error);
    return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
  }
}
