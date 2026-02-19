import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { StartGGClient } from '@fightrise/startgg-client';

interface ValidateTournamentRequest {
  slug: string;
}

/**
 * POST /api/tournaments/validate
 * Validates a Start.gg tournament slug and returns tournament details
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.discordId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ValidateTournamentRequest = await request.json();
    const { slug } = body;

    if (!slug) {
      return NextResponse.json({ error: 'Tournament slug is required' }, { status: 400 });
    }

    // Create Start.gg client
    const apiKey = process.env.STARTGG_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const startggClient = new StartGGClient({ apiKey });

    // Fetch tournament data from Start.gg
    const tournament = await startggClient.getTournament(slug);

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found. Please check the URL and try again.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      tournament: {
        name: tournament.name,
        startAt: tournament.startAt,
        endAt: tournament.endAt,
        state: tournament.state,
      },
    });
  } catch (error) {
    console.error('Error validating tournament:', error);
    return NextResponse.json(
      { error: 'Failed to validate tournament. Please check the URL and try again.' },
      { status: 500 }
    );
  }
}
