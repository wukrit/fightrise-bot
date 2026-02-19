import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@fightrise/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp, createRateLimitHeaders, RATE_LIMIT_CONFIGS } from '@/lib/ratelimit';

/**
 * GET /api/matches/[id]
 * Returns a single match by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(request);
  const result = await checkRateLimit(ip, RATE_LIMIT_CONFIGS.read);

  const headers = createRateLimitHeaders(result);
  if (!result.allowed) {
    return new Response('Too Many Requests', {
      status: 429,
      headers,
    });
  }

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.discordId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Find the user
    const user = await prisma.user.findUnique({
      where: { discordId: session.user.discordId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get the match
    const match = await prisma.match.findUnique({
      where: { id },
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
    });

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

    // Check if user is a player in this match
    const userPlayer = match.players.find((p) => p.userId === user.id);

    if (!userPlayer) {
      return NextResponse.json(
        { error: 'Not authorized to view this match' },
        { status: 403 }
      );
    }

    const opponent = match.players.find((p) => p.userId !== user.id);

    const player1 = match.players[0];
    const player2 = match.players[1];

    // Transform response
    const matchData = {
      id: match.id,
      tournamentId: match.event.tournamentId,
      tournamentName: match.event.tournament.name,
      round: match.round,
      bestOf: 3, // Default
      state: match.state,
      checkInDeadline: match.checkInDeadline,
      player1: player1 && player1.user
        ? {
            id: player1.user.id,
            name: player1.user.discordUsername,
            discordId: player1.user.discordId,
            reportedScore: player1.reportedScore,
            isWinner: player1.isWinner,
          }
        : null,
      player2: player2 && player2.user
        ? {
            id: player2.user.id,
            name: player2.user.discordUsername,
            discordId: player2.user.discordId,
            reportedScore: player2.reportedScore,
            isWinner: player2.isWinner,
          }
        : null,
      myReportedScore: userPlayer.reportedScore,
      myIsWinner: userPlayer.isWinner,
    };

    const response = NextResponse.json(matchData);

    // Add rate limit headers
    for (const [key, value] of headers.entries()) {
      response.headers.set(key, value);
    }

    return response;
  } catch (error) {
    console.error('Error fetching match:', error);
    const errorResponse = NextResponse.json(
      { error: 'Failed to fetch match' },
      { status: 500 }
    );
    for (const [key, value] of headers.entries()) {
      errorResponse.headers.set(key, value);
    }
    return errorResponse;
  }
}
