import { NextRequest, NextResponse } from 'next/server';
import { prisma, AdminRole, RegistrationStatus } from '@fightrise/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * POST /api/registrations/[id]/reject
 * Reject a registration (admin operation)
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
        { error: 'Only tournament admins can reject registrations' },
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

    // Reject the registration
    const updatedRegistration = await prisma.registration.update({
      where: { id: registrationId },
      data: { status: RegistrationStatus.CANCELLED },
    });

    return NextResponse.json({
      success: true,
      registration: {
        id: updatedRegistration.id,
        status: updatedRegistration.status,
      },
    });
  } catch (error: unknown) {
    console.error('Reject registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
