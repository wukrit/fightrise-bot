import { NextRequest, NextResponse } from 'next/server';
import { prisma, MatchState, AuditAction, AuditSource } from '@fightrise/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

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
      // Update match state to DQ
      await tx.match.update({
        where: { id: matchId },
        data: { state: MatchState.DQ },
      });

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
          action: AuditAction.MATCH_DQ,
          entityType: 'Match',
          entityId: matchId,
          source: AuditSource.DISCORD,
          reason: reason,
          before: JSON.stringify({ state: match.state }),
          after: JSON.stringify({ state: MatchState.DQ }),
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Player disqualified from match`,
    });
  } catch (error) {
    console.error('DQ error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
