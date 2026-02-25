export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma, RegistrationStatus, AuditAction, AuditSource } from '@fightrise/database';
import { requireTournamentAdmin } from '@/lib/tournament-admin';
import { withRateLimit, applyRateLimitHeaders } from '@/lib/admin-rate-limit';
import { z } from 'zod';

// Validation schema for PATCH action
const updateRegistrationSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
});

/**
 * PATCH /api/tournaments/[id]/admin/registrations/[registrationId]
 * Approve or reject a registration (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; registrationId: string }> }
) {
  const rateLimitResult = await withRateLimit(request, 'write');
  if (!rateLimitResult || rateLimitResult.response) {
    return rateLimitResult?.response || new Response('Rate limit error', { status: 500 });
  }

  try {
    const { id: tournamentId, registrationId } = await params;
    const body = await request.json();

    // Check authorization using helper
    const authResult = await requireTournamentAdmin(request, tournamentId);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const adminUserId = authResult.userId;

    // Validate input
    const validationResult = updateRegistrationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { action, reason } = validationResult.data;

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

    // Find the registration
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: {
        user: {
          select: {
            id: true,
            discordId: true,
            discordUsername: true,
            startggGamerTag: true,
          },
        },
      },
    });

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      );
    }

    // Verify registration belongs to this tournament (IDOR protection)
    if (registration.tournamentId !== tournamentId) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      );
    }

    // Validate action
    if (action === 'reject' && !reason) {
      return NextResponse.json(
        { error: 'Reason is required when rejecting a registration' },
        { status: 400 }
      );
    }

    // Determine new status and audit action
    const newStatus = action === 'approve' ? RegistrationStatus.CONFIRMED : RegistrationStatus.CANCELLED;
    const auditAction = action === 'approve' ? AuditAction.REGISTRATION_APPROVED : AuditAction.REGISTRATION_REJECTED;

    // Update registration with audit log in transaction
    const updatedRegistration = await prisma.$transaction(async (tx) => {
      // Update registration
      const updated = await tx.registration.update({
        where: { id: registrationId },
        data: { status: newStatus },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: auditAction,
          entityType: 'Registration',
          entityId: registrationId,
          userId: adminUserId,
          before: {
            status: registration.status,
          },
          after: {
            status: newStatus,
          },
          reason: reason || null,
          source: AuditSource.WEB,
        },
      });

      return updated;
    });

    const response = NextResponse.json({
      success: true,
      registration: {
        id: updatedRegistration.id,
        user: registration.user,
        status: updatedRegistration.status,
        source: registration.source,
        createdAt: registration.createdAt,
        updatedAt: updatedRegistration.updatedAt,
      },
    });

    // Add rate limit headers
    return applyRateLimitHeaders(response, rateLimitResult.headers);
  } catch (error: unknown) {
    console.error('Admin registration update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tournaments/[id]/admin/registrations/[registrationId]
 * Delete a registration (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; registrationId: string }> }
) {
  const rateLimitResult = await withRateLimit(request, 'write');
  if (!rateLimitResult || rateLimitResult.response) {
    return rateLimitResult?.response || new Response('Rate limit error', { status: 500 });
  }

  try {
    const { id: tournamentId, registrationId } = await params;

    // Check authorization using helper
    const authResult = await requireTournamentAdmin(request, tournamentId);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const adminUserId = authResult.userId;

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

    // Find the registration
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
    });

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      );
    }

    // Verify registration belongs to this tournament (IDOR protection)
    if (registration.tournamentId !== tournamentId) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      );
    }

    // Delete registration with audit log in transaction
    await prisma.$transaction(async (tx) => {
      // Store registration data for audit log before deletion
      const registrationData = {
        userId: registration.userId,
        tournamentId: registration.tournamentId,
        status: registration.status,
        source: registration.source,
      };

      // Delete registration
      await tx.registration.delete({
        where: { id: registrationId },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: AuditAction.REGISTRATION_MANUAL_REMOVE,
          entityType: 'Registration',
          entityId: registrationId,
          userId: adminUserId,
          before: registrationData,
          source: AuditSource.WEB,
        },
      });
    });

    const response = NextResponse.json({
      success: true,
      message: 'Registration deleted successfully',
    });

    // Add rate limit headers
    return applyRateLimitHeaders(response, rateLimitResult.headers);
  } catch (error: unknown) {
    console.error('Admin registration delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
