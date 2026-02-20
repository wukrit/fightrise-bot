import { NextRequest, NextResponse } from 'next/server';
import { prisma, MatchState, AuditAction, AuditSource, AdminRole } from '@fightrise/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { checkRateLimit, getClientIp, createRateLimitHeaders, RATE_LIMIT_CONFIGS } from '@/lib/ratelimit';

// Validation schema for DQ request
const dqSchema = z.object({
  playerId: z.string().min(1, 'Player ID is required'),
  reason: z.string().min(1, 'Reason is required'),
});

/**
 * POST /api/matches/[id]/dq
 * Disqualify a player from a match
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

    const { id: matchId } = await params;
    const body = await request.json();

    // Validate input
    const validationResult = dqSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { playerId, reason } = validationResult.data;

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

    // Get the match with players
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        players: true,
        event: { include: { tournament: true } },
      },
    });

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

    // Check if user is authorized to DQ players (admin or participant)
    const isParticipant = match.players.some((p) => p.userId === user.id);

    const adminCheck = await prisma.tournamentAdmin.findFirst({
      where: {
        userId: user.id,
        tournamentId: match.event.tournamentId,
        role: { in: [AdminRole.OWNER, AdminRole.ADMIN, AdminRole.MODERATOR] },
      },
    });

    if (!adminCheck && !isParticipant) {
      return NextResponse.json(
        { error: 'Not authorized to DQ players in this tournament' },
        { status: 403 }
      );
    }

    // Validate match is not already completed
    if (match.state === MatchState.COMPLETED || match.state === MatchState.DQ) {
      return NextResponse.json(
        { error: 'Match is already completed' },
        { status: 400 }
      );
    }

    // Find the player to DQ
    const dqPlayer = match.players.find((p) => p.id === playerId);
    if (!dqPlayer) {
      return NextResponse.json(
        { error: 'Player not found in match' },
        { status: 404 }
      );
    }

    // Find the opponent
    const opponent = match.players.find((p) => p.id !== playerId);
    if (!opponent) {
      return NextResponse.json(
        { error: 'No opponent found' },
        { status: 400 }
      );
    }

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Update match state with state guard to prevent concurrent modifications
      const updateMatchResult = await tx.match.updateMany({
        where: {
          id: matchId,
          state: { notIn: [MatchState.COMPLETED, MatchState.DQ] },
        },
        data: { state: MatchState.DQ },
      });

      // If no rows updated, match was already completed or DQ'd
      if (updateMatchResult.count === 0) {
        throw new Error('Match has already been completed or DQd');
      }

      // DQ the player
      await tx.matchPlayer.update({
        where: { id: playerId },
        data: { isWinner: false, reportedScore: 0 },
      });

      // Set opponent as winner with 2-0 score
      await tx.matchPlayer.update({
        where: { id: opponent.id },
        data: { isWinner: true, reportedScore: 2 },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: AuditAction.PLAYER_DQ,
          entityType: 'Match',
          entityId: matchId,
          source: AuditSource.API,
          reason: reason,
          before: JSON.stringify({ state: match.state }),
          after: JSON.stringify({ state: MatchState.DQ }),
        },
      });
    });

    const response = NextResponse.json({
      success: true,
      message: `Player disqualified from match`,
    });

    // Add rate limit headers
    for (const [key, value] of headers.entries()) {
      response.headers.set(key, value);
    }

    return response;
  } catch (error: unknown) {
    console.error('DQ error:', error);

    // Handle state guard error
    if (error instanceof Error && error.message === 'Match has already been completed or DQd') {
      const errorResponse = NextResponse.json(
        { error: 'Match has already been completed or DQd' },
        { status: 409 }
      );
      for (const [key, value] of headers.entries()) {
        errorResponse.headers.set(key, value);
      }
      return errorResponse;
    }

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
