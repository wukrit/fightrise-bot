export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma, MatchState, AuditAction, AuditSource } from '@fightrise/database';
import { requireTournamentAdmin } from '@/lib/tournament-admin';
import { checkRateLimit, getClientIp, createRateLimitHeaders, RATE_LIMIT_CONFIGS } from '@/lib/ratelimit';
import { z } from 'zod';

// Validation schema for DQ request
const dqRequestSchema = z.object({
  matchId: z.string().min(1, 'Match ID is required'),
  reason: z.string().optional(),
});

/**
 * POST /api/tournaments/[id]/admin/players/[playerId]/dq
 * Disqualify a player from a match (admin only)
 * Creates audit log and syncs to Start.gg
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; playerId: string }> }
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
    const { id: tournamentId, playerId: dqPlayerId } = await params;
    const body = await request.json();

    // Validate input
    const validationResult = dqRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { matchId, reason } = validationResult.data;

    // Check authorization using helper
    const authResult = await requireTournamentAdmin(request, tournamentId);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { userId: adminUserId } = authResult;

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

    // Fetch match with players
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        players: {
          include: { user: true },
          orderBy: { id: 'asc' },
        },
        event: { include: { tournament: true } },
      },
    });

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

    // Verify match belongs to this tournament
    if (match.event.tournamentId !== tournamentId) {
      return NextResponse.json(
        { error: 'Match does not belong to this tournament' },
        { status: 403 }
      );
    }

    // Validate match is not already completed
    if (match.state === MatchState.COMPLETED || match.state === MatchState.DQ) {
      return NextResponse.json(
        { error: 'Match is already completed or DQd' },
        { status: 400 }
      );
    }

    // Find the player to DQ
    const dqPlayer = match.players.find((p) => p.id === dqPlayerId);
    if (!dqPlayer) {
      return NextResponse.json(
        { error: 'Player not found in match' },
        { status: 404 }
      );
    }

    // Find the opponent
    const opponent = match.players.find((p) => p.id !== dqPlayerId);
    if (!opponent) {
      return NextResponse.json(
        { error: 'No opponent found' },
        { status: 400 }
      );
    }

    // Store before state for audit
    const beforeState = {
      matchState: match.state,
      players: match.players.map((p) => ({
        id: p.id,
        isWinner: p.isWinner,
      })),
    };

    // Perform DQ in transaction
    try {
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

        // Mark the DQ'd player as loser
        await tx.matchPlayer.update({
          where: { id: dqPlayerId },
          data: { isWinner: false },
        });

        // Mark opponent as winner
        await tx.matchPlayer.update({
          where: { id: opponent.id },
          data: { isWinner: true },
        });

        // Store after state for audit
        const afterState = {
          matchState: MatchState.DQ,
          players: [
            { id: dqPlayerId, isWinner: false, dq: true },
            { id: opponent.id, isWinner: true, dq: false },
          ],
        };

        // Create audit log entry
        await tx.auditLog.create({
          data: {
            action: AuditAction.PLAYER_DQ,
            entityType: 'Match',
            entityId: matchId,
            userId: adminUserId,
            before: beforeState,
            after: afterState,
            reason: reason || 'Admin disqualification',
            source: AuditSource.API,
          },
        });
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Match has already been completed or DQd') {
          return NextResponse.json(
            { error: 'Match has already been completed or DQd' },
            { status: 400 }
          );
        }
      }
      throw error;
    }

    // TODO: Sync to Start.gg once mutation is implemented
    // For now, log that Start.gg sync is pending
    console.log(`[DQ] Database updated for player ${dqPlayer.playerName} in match ${match.identifier}`);
    console.log(`[DQ] Start.gg sync pending - requires dqEntrant mutation`);

    const response = NextResponse.json({
      success: true,
      message: `${dqPlayer.playerName} has been disqualified. ${opponent.playerName} wins by default.`,
    });

    // Add rate limit headers
    for (const [key, value] of headers.entries()) {
      response.headers.set(key, value);
    }

    return response;
  } catch (error: unknown) {
    console.error('Admin DQ error:', error);
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
