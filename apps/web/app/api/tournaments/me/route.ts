import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@fightrise/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/tournaments/me
 * Returns tournaments for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.discordId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');

    // Get tournaments where user is an admin
    const adminTournaments = await prisma.tournamentAdmin.findMany({
      where: {
        user: {
          discordId: session.user.discordId,
        },
      },
      include: {
        tournament: {
          include: {
            _count: {
              select: { registrations: true },
            },
          },
        },
      },
    });

    // Also get tournaments where user has registrations
    const registrations = await prisma.registration.findMany({
      where: {
        user: {
          discordId: session.user.discordId,
        },
        tournament: state ? { state: state as any } : undefined,
      },
      include: {
        tournament: {
          include: {
            _count: {
              select: { registrations: true },
            },
          },
        },
      },
    });

    // Combine and deduplicate tournaments
    const tournamentMap = new Map();

    for (const admin of adminTournaments) {
      if (admin.tournament) {
        tournamentMap.set(admin.tournament.id, {
          ...admin.tournament,
          userRole: admin.role,
        });
      }
    }

    for (const reg of registrations) {
      if (reg.tournament && !tournamentMap.has(reg.tournament.id)) {
        tournamentMap.set(reg.tournament.id, {
          ...reg.tournament,
          userRole: null,
          registrationStatus: reg.status,
        });
      }
    }

    const tournaments = Array.from(tournamentMap.values());

    return NextResponse.json(tournaments);
  } catch (error) {
    console.error('Error fetching user tournaments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tournaments' },
      { status: 500 }
    );
  }
}
