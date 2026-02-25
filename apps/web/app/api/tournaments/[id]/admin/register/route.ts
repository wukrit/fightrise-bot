export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma, RegistrationSource, RegistrationStatus } from '@fightrise/database';
import { requireTournamentAdmin } from '@/lib/tournament-admin';
import { z } from 'zod';
import { checkRateLimit, getClientIp, createRateLimitHeaders, RATE_LIMIT_CONFIGS } from '@/lib/ratelimit';

// Validation schema for admin registration
const adminRegisterSchema = z.object({
  discordId: z.string().min(1, 'Discord ID is required'),
  discordUsername: z.string().min(1, 'Discord username is required'),
});

/**
 * POST /api/tournaments/[id]/admin/register
 * Register a player to a tournament (admin operation)
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
    const { id: tournamentId } = await params;
    const body = await request.json();

    // Validate input
    const validationResult = adminRegisterSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { discordId, discordUsername } = validationResult.data;

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

    // Find or create the player user
    let player = await prisma.user.findUnique({
      where: { discordId },
    });

    if (!player) {
      player = await prisma.user.create({
        data: {
          discordId,
          discordUsername,
        },
      });
    }

    // Check for existing registration
    const existingRegistration = await prisma.registration.findFirst({
      where: {
        userId: player.id,
        tournamentId,
      },
    });

    if (existingRegistration) {
      return NextResponse.json(
        { error: 'Player already registered for this tournament' },
        { status: 400 }
      );
    }

    // Create registration
    const registration = await prisma.registration.create({
      data: {
        userId: player.id,
        tournamentId,
        source: RegistrationSource.MANUAL,
        status: RegistrationStatus.CONFIRMED,
      },
    });

    const response = NextResponse.json({
      success: true,
      registration: {
        id: registration.id,
        userId: registration.userId,
        status: registration.status,
      },
    });

    // Add rate limit headers
    for (const [key, value] of headers.entries()) {
      response.headers.set(key, value);
    }

    return response;
  } catch (error: unknown) {
    console.error('Admin registration error:', error);
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
