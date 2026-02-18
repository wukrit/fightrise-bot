import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@fightrise/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
    const { winnerId, player1Score, player2Score } = body;

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

    // Check if match is in a state that allows reporting
    if (!['CALLED', 'CHECKED_IN', 'IN_PROGRESS', 'PENDING_CONFIRMATION'].includes(match.state)) {
      return NextResponse.json(
        { error: 'Match is not in a state that allows reporting' },
        { status: 400 }
      );
    }

    // Determine if user won
    const userWon = winnerId === user.id;

    // Update the match player's reported score and determine match state in a transaction
    const result = await prisma.$transaction(async (tx) => {
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
          // Both agree - mark as completed
          await tx.match.update({
            where: { id },
            data: {
              state: 'COMPLETED',
            },
          });
          return { state: 'COMPLETED' };
        } else {
          // Discrepancy - needs dispute resolution
          await tx.match.update({
            where: { id },
            data: {
              state: 'DISPUTED',
            },
          });
          return { state: 'DISPUTED' };
        }
      } else {
        // Just this player reported - mark as pending confirmation
        await tx.match.update({
          where: { id },
          data: {
            state: 'PENDING_CONFIRMATION',
          },
        });
        return { state: 'PENDING_CONFIRMATION' };
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reporting score:', error);
    return NextResponse.json(
      { error: 'Failed to report score' },
      { status: 500 }
    );
  }
}
