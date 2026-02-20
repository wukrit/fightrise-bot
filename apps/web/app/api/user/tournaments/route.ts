import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@fightrise/database';

/**
 * GET /api/user/tournaments
 * Returns the current user's tournament history
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
      return NextResponse.json({ tournaments: [] });
    }

    // Get tournaments where user has registrations
    const registrations = await prisma.registration.findMany({
      where: { userId: user.id },
      include: {
        tournament: true,
      },
      orderBy: {
        tournament: {
          startAt: 'desc',
        },
      },
      take: 20,
    });

    const tournaments = registrations.map((reg) => ({
      id: reg.tournament.id,
      name: reg.tournament.name,
      startAt: reg.tournament.startAt,
      endAt: reg.tournament.endAt,
      state: reg.tournament.state,
      placement: null, // Would need to query MatchPlayer for placement
    }));

    return NextResponse.json({ tournaments });
  } catch (error) {
    console.error('Error fetching user tournaments:', error);
    return NextResponse.json({ error: 'Failed to fetch tournaments' }, { status: 500 });
  }
}
