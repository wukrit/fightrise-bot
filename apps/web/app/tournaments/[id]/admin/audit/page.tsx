import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@fightrise/database';
import { requireTournamentAdminById } from '@/lib/tournament-admin';
import { AuditLogList } from '@/components/admin/AuditLogList';

interface SearchParams {
  action?: string;
  page?: string;
}

async function getAuditLogs(tournamentId: string, searchParams: SearchParams) {
  const action = searchParams.action as 'REGISTRATION_APPROVED' | 'REGISTRATION_REJECTED' | 'REGISTRATION_MANUAL_ADD' | 'REGISTRATION_MANUAL_REMOVE' | undefined;
  const page = parseInt(searchParams.page || '1', 10);
  const limit = 20;
  const skip = (page - 1) * limit;

  const REGISTRATION_ACTIONS = [
    'REGISTRATION_APPROVED',
    'REGISTRATION_REJECTED',
    'REGISTRATION_MANUAL_ADD',
    'REGISTRATION_MANUAL_REMOVE',
  ];

  const where: Record<string, unknown> = {
    action: { in: REGISTRATION_ACTIONS },
  };

  if (action && REGISTRATION_ACTIONS.includes(action)) {
    where.action = action;
  }

  const [auditLogs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            discordUsername: true,
            startggGamerTag: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    auditLogs: auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      user: log.user,
      before: log.before,
      after: log.after,
      reason: log.reason,
      source: log.source,
      createdAt: log.createdAt.toISOString(),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getTournamentName(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { name: true },
  });
  return tournament?.name || 'Tournament';
}

export default async function AdminAuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id: tournamentId } = await params;
  const resolvedSearchParams = await searchParams;

  // Authorization check
  const auth = await requireTournamentAdminById(tournamentId);
  if (auth instanceof Response) {
    // For 401/403, redirect to sign in or show not found
    const { status } = auth;
    if (status === 401) {
      redirect('/api/auth/signin');
    }
    return notFound();
  }

  const [data, tournamentName] = await Promise.all([
    getAuditLogs(tournamentId, resolvedSearchParams),
    getTournamentName(tournamentId),
  ]);

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-800/50 bg-zinc-900/20">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex items-center gap-2 py-4 text-sm">
            <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-300 transition-colors">
              Dashboard
            </Link>
            <span className="text-zinc-600">/</span>
            <Link href={`/tournaments/${tournamentId}`} className="text-zinc-500 hover:text-zinc-300 transition-colors">
              Tournament
            </Link>
            <span className="text-zinc-600">/</span>
            <Link href={`/tournaments/${tournamentId}/admin`} className="text-zinc-500 hover:text-zinc-300 transition-colors">
              Admin
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300">Audit Log</span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Audit Log</h1>
            <p className="text-sm text-zinc-400">{tournamentName}</p>
          </div>
          <Link
            href={`/tournaments/${tournamentId}/admin/registrations`}
            className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Back to Registrations
          </Link>
        </div>

        <AuditLogList
          initialLogs={data.auditLogs}
          initialPagination={data.pagination}
          tournamentId={tournamentId}
        />
      </div>
    </div>
  );
}
