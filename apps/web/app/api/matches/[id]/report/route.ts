import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@fightrise/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { MatchState } from '@prisma/client';
import { z } from 'zod';

// Validation schema for score reporting
const scoreReportSchema = z.object({
  winnerId: z.string().min(1, 'Winner ID is required'),
  player1Score: z
    .number()
    .int('Score must be an integer')
    .min(0, 'Score cannot be negative')
    .max(99, 'Score is too high'),
  player2Score: z
    .number()
    .int('Score must be an integer')
    .min(0, 'Score cannot be negative')
    .max(99, 'Score is too high'),
});

/**
 * POST /api/matches/[id]/report
 * Report the score for a match
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

    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validationResult = scoreReportSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { winnerId, player1Score, player2Score } = validationResult.data;

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
        { error: 'Not authorized to report for this match' },
        { status: 403 }
      );
    }

    // Determine if user won
    const userWon = winnerId === user.id;

    // Update the match player's reported score and determine match state in a transaction
    // Use atomic updateMany with state guards to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Get valid states that allow reporting
      const validStates = [
        MatchState.CALLED,
        MatchState.CHECKED_IN,
        MatchState.IN_PROGRESS,
        MatchState.PENDING_CONFIRMATION,
      ];

      // Use updateMany with state guard for optimistic locking
      const matchUpdate = await tx.match.updateMany({
        where: { id, state: { in: validStates } },
        data: {
          // Transition to appropriate state based on opponent reporting
          state: MatchState.PENDING_CONFIRMATION,
        },
      });

      // If no rows updated, match is not in a state that allows reporting (race condition - another request already processed)
      if (matchUpdate.count === 0) {
        // Check if already completed
        const currentMatch = await tx.match.findUnique({ where: { id } });
        if (currentMatch?.state === MatchState.COMPLETED) {
          throw new Error('MATCH_COMPLETED');
        }
        throw new Error('INVALID_STATE');
      }

      // Update the current player's reported score
      await tx.matchPlayer.update({
        where: { id: userPlayer.id },
        data: {
          isWinner: userWon,
          reportedScore: userWon ? player1Score : player2Score,
        },
      });

      // Re-fetch match with players to get current state
      const updatedMatch = await tx.match.findUnique({
        where: { id },
        include: {
          players: true,
        },
      });

      if (!updatedMatch) {
        throw new Error('Match not found');
      }

      // Check if opponent has reported
      const opponentPlayer = updatedMatch.players.find((p) => p.userId !== user.id);

      if (opponentPlayer?.reportedScore !== null && opponentPlayer?.reportedScore !== undefined) {
        // Both have reported - check if scores match
        const opponentWon = opponentPlayer.isWinner;

        if (userWon === opponentWon) {
          // Both agree - use atomic updateMany with state guard
          await tx.match.updateMany({
            where: { id, state: MatchState.PENDING_CONFIRMATION },
            data: { state: MatchState.COMPLETED },
          });
          return { state: MatchState.COMPLETED };
        } else {
          // Discrepancy - use atomic updateMany with state guard
          await tx.match.updateMany({
            where: { id, state: MatchState.PENDING_CONFIRMATION },
            data: { state: MatchState.DISPUTED },
          });
          return { state: MatchState.DISPUTED };
        }
      }

      // Just this player reported - already set to PENDING_CONFIRMATION above
      return { state: MatchState.PENDING_CONFIRMATION };
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reporting score:', error);

    // Handle specific race condition errors
    if (error instanceof Error) {
      if (error.message === 'MATCH_COMPLETED') {
        return NextResponse.json(
          { error: 'Match has already been completed' },
          { status: 400 }
        );
      }
      if (error.message === 'INVALID_STATE') {
        return NextResponse.json(
          { error: 'Match is not in a state that allows reporting' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to report score' },
      { status: 500 }
    );
  }
}
