import { NextRequest, NextResponse } from 'next/server';
import { prisma, AdminRole, RegistrationStatus } from '@fightrise/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp, createRateLimitHeaders, RATE_LIMIT_CONFIGS } from '@/lib/ratelimit';

/**
 * POST /api/registrations/[id]/approve
 * Approve a registration (admin operation)
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

    const { id: registrationId } = await params;

    // Find the registration
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        tournament: true,
      },
    });

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      );
    }

    const tournamentId = registration.tournamentId;

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { discordId: session.user.discordId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const adminCheck = await prisma.tournamentAdmin.findFirst({
      where: {
        userId: user.id,
        tournamentId,
        role: { in: [AdminRole.OWNER, AdminRole.ADMIN, AdminRole.MODERATOR] },
      },
    });

    if (!adminCheck) {
      return NextResponse.json(
        { error: 'Only tournament admins can approve registrations' },
        { status: 403 }
      );
    }

    // Check if registration is already processed
    if (registration.status !== RegistrationStatus.PENDING) {
      return NextResponse.json(
        { error: 'Registration is not pending approval' },
        { status: 400 }
      );
    }

    // Approve the registration
    const updatedRegistration = await prisma.registration.update({
      where: { id: registrationId },
      data: { status: RegistrationStatus.CONFIRMED },
    });

    const response = NextResponse.json({
      success: true,
      registration: {
        id: updatedRegistration.id,
        status: updatedRegistration.status,
      },
    });

    // Add rate limit headers
    for (const [key, value] of headers.entries()) {
      response.headers.set(key, value);
    }

    return response;
  } catch (error: unknown) {
    console.error('Approve registration error:', error);
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
