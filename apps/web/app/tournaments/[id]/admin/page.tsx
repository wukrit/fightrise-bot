import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma, TournamentState } from '@fightrise/database';
import { requireTournamentAdminById } from '@/lib/tournament-admin';
import { Card } from '@fightrise/ui';

async function getTournamentData(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      _count: {
        select: {
          registrations: true,
          events: true,
        },
      },
      events: {
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              matches: true,
            },
          },
        },
      },
    },
  });

  if (!tournament) return null;

  const matchCount = await prisma.match.count({
    where: {
      event: {
        tournamentId,
      },
    },
  });

  const recentAuditLogs = await prisma.auditLog.findMany({
    where: {
      tournamentId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
    include: {
      user: {
        select: {
          discordUsername: true,
        },
      },
    },
  });

  return {
    tournament,
    matchCount,
    recentAuditLogs,
  };
}

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: tournamentId } = await params;

  // Authorization check
  const auth = await requireTournamentAdminById(tournamentId);
  if (auth instanceof Response) {
    return auth;
  }

  const data = await getTournamentData(tournamentId);
  if (!data) {
    notFound();
  }

  const { tournament, matchCount, recentAuditLogs } = data;

  const stateLabels: Record<TournamentState, string> = {
    [TournamentState.CREATED]: 'Created',
    [TournamentState.REGISTRATION_OPEN]: 'Registration Open',
    [TournamentState.REGISTRATION_CLOSED]: 'Registration Closed',
    [TournamentState.IN_PROGRESS]: 'In Progress',
    [TournamentState.COMPLETED]: 'Completed',
    [TournamentState.CANCELLED]: 'Cancelled',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tournament Admin</h1>
          <p className="text-muted-foreground">{tournament.name}</p>
        </div>
        <Link
          href={`/tournaments/${tournamentId}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Tournament
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <p className="text-sm font-medium text-muted-foreground">State</p>
          <p className="mt-2 text-2xl font-bold">
            {stateLabels[tournament.state] || tournament.state}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm font-medium text-muted-foreground">Registrations</p>
          <p className="mt-2 text-2xl font-bold">
            {tournament._count.registrations}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm font-medium text-muted-foreground">Matches</p>
          <p className="mt-2 text-2xl font-bold">{matchCount}</p>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href={`/tournaments/${tournamentId}/admin/registrations`}
          className="block rounded-lg border p-4 hover:bg-muted/50"
        >
          <h3 className="font-semibold">Registrations</h3>
          <p className="text-sm text-muted-foreground">
            Manage tournament registrations
          </p>
        </Link>
        <Link
          href={`/tournaments/${tournamentId}/admin/matches`}
          className="block rounded-lg border p-4 hover:bg-muted/50"
        >
          <h3 className="font-semibold">Matches</h3>
          <p className="text-sm text-muted-foreground">
            View and manage matches
          </p>
        </Link>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Recent Activity</h2>
        {recentAuditLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity</p>
        ) : (
          <div className="rounded-lg border">
            {recentAuditLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between border-b px-4 py-3 last:border-b-0"
              >
                <div>
                  <p className="font-medium">{log.action}</p>
                  <p className="text-sm text-muted-foreground">
                    by {log.user?.discordUsername || 'Unknown'}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
