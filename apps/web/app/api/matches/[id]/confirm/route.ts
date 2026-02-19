import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@fightrise/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp, createRateLimitHeaders, RATE_LIMIT_CONFIGS } from '@/lib/ratelimit';

/**
 * POST /api/matches/[id]/confirm
 * Confirm the result of a match
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(request);
  const result = await checkRateLimit(ip, RATE_LIMIT_CONFIGS.write);

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
        players: true,
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
        { error: 'Not authorized to confirm this match' },
        { status: 403 }
      );
    }

    // Check if match is in pending confirmation state
    if (match.state !== 'PENDING_CONFIRMATION') {
      return NextResponse.json(
        { error: 'Match is not waiting for confirmation' },
        { status: 400 }
      );
    }

    // Confirm the result - for now, just update the match state
    // In a real implementation, we'd track confirmations properly
    await prisma.match.update({
      where: { id },
      data: {
        state: 'COMPLETED',
      },
    });

    const response = NextResponse.json({ success: true });

    // Add rate limit headers
    for (const [key, value] of headers.entries()) {
      response.headers.set(key, value);
    }

    return response;
  } catch (error) {
    console.error('Error confirming result:', error);
    const errorResponse = NextResponse.json(
      { error: 'Failed to confirm result' },
      { status: 500 }
    );
    for (const [key, value] of headers.entries()) {
      errorResponse.headers.set(key, value);
    }
    return errorResponse;
  }
}
