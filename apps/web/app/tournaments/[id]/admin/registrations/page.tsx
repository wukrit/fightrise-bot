import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@fightrise/database';
import { requireTournamentAdminById } from '@/lib/tournament-admin';
import { ClientRegistrationsTable } from '@/components/admin/ClientRegistrationsTable';

interface SearchParams {
  status?: string;
  page?: string;
}

async function getRegistrations(tournamentId: string, searchParams: SearchParams) {
  const status = searchParams.status as 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'DQ' | undefined;
  const page = parseInt(searchParams.page || '1', 10);
  const limit = 20;
  const skip = (page - 1) * limit;

  const where: { tournamentId: string; status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'DQ' } = {
    tournamentId,
  };
  if (status) {
    where.status = status;
  }

  const [registrations, total] = await Promise.all([
    prisma.registration.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            discordId: true,
            discordUsername: true,
            startggId: true,
            startggGamerTag: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.registration.count({ where }),
  ]);

  return {
    registrations: registrations.map((r) => ({
      id: r.id,
      user: r.user,
      status: r.status,
      source: r.source,
      createdAt: r.createdAt.toISOString(),
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

export default async function AdminRegistrationsPage({
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
    return notFound();
  }

  const [data, tournamentName] = await Promise.all([
    getRegistrations(tournamentId, resolvedSearchParams),
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
            <span className="text-zinc-300">Registrations</span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Registrations</h1>
            <p className="text-sm text-zinc-400">{tournamentName}</p>
          </div>
          <Link
            href={`/tournaments/${tournamentId}/admin/audit`}
            className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            View Audit Log
          </Link>
        </div>

        <ClientRegistrationsTable
          initialData={data}
          tournamentId={tournamentId}
        />
      </div>
    </div>
  );
}
