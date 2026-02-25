import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma, MatchState } from '@fightrise/database';
import { requireTournamentAdminById } from '@/lib/tournament-admin';
import { ClientMatchesTable } from '@/components/admin/ClientMatchesTable';

interface SearchParams {
  state?: string;
  round?: string;
  page?: string;
  playerName?: string;
}

async function getMatches(tournamentId: string, searchParams: SearchParams) {
  const state = searchParams.state as MatchState | undefined;
  const round = searchParams.round ? parseInt(searchParams.round, 10) : undefined;
  const page = parseInt(searchParams.page || '1', 10);
  const limit = 50;
  const skip = (page - 1) * limit;
  const playerName = searchParams.playerName || undefined;

  // Get event IDs for this tournament
  const events = await prisma.event.findMany({
    where: { tournamentId },
    select: { id: true },
  });
  const eventIds = events.map((e) => e.id);

  if (eventIds.length === 0) {
    return {
      matches: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
    };
  }

  // Build where clause for filtering
  // Note: For filtering by player name in a relation, we use 'some' operator
  // which checks if ANY related player matches the criteria
  // Using type assertion to fix TypeScript inference issue with QueryMode
  const playerNameFilter = playerName
    ? {
        some: {
          OR: [
            { playerName: { contains: playerName, mode: 'insensitive' as const } },
            { user: { discordUsername: { contains: playerName, mode: 'insensitive' as const } } },
            { user: { startggGamerTag: { contains: playerName, mode: 'insensitive' as const } } },
          ],
        },
      }
    : undefined;

  const where: {
    eventId: { in: string[] };
    state?: MatchState;
    round?: number;
    players?: typeof playerNameFilter;
  } = { eventId: { in: eventIds } };

  if (state) {
    where.state = state;
  }

  if (round !== undefined) {
    where.round = round;
  }

  if (playerName) {
    where.players = playerNameFilter;
  }

  // Get total count
  const total = await prisma.match.count({ where });

  // Get paginated matches
  const matches = await prisma.match.findMany({
    where,
    include: {
      event: {
        select: {
          id: true,
          name: true,
          tournamentId: true,
        },
      },
      players: {
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
        orderBy: { id: 'asc' },
      },
    },
    orderBy: [{ round: 'asc' }, { identifier: 'asc' }],
    skip,
    take: limit,
  });

  return {
    matches: matches.map((match) => ({
      id: match.id,
      identifier: match.identifier,
      roundText: match.roundText,
      round: match.round,
      state: match.state,
      checkInDeadline: match.checkInDeadline?.toISOString() || null,
      createdAt: match.createdAt.toISOString(),
      updatedAt: match.updatedAt.toISOString(),
      event: match.event,
      players: match.players.map((player) => ({
        id: player.id,
        playerName: player.playerName,
        isCheckedIn: player.isCheckedIn,
        checkedInAt: player.checkedInAt?.toISOString() || null,
        reportedScore: player.reportedScore,
        isWinner: player.isWinner,
        user: player.user,
      })),
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

async function getAvailableRounds(tournamentId: string) {
  const events = await prisma.event.findMany({
    where: { tournamentId },
    select: { id: true },
  });
  const eventIds = events.map((e) => e.id);

  if (eventIds.length === 0) return [];

  const rounds = await prisma.match.findMany({
    where: { eventId: { in: eventIds } },
    select: { round: true, roundText: true },
    distinct: ['round'],
    orderBy: { round: 'asc' },
  });

  return rounds.map((r) => ({ round: r.round, roundText: r.roundText }));
}

export default async function AdminMatchesPage({
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
    return auth;
  }

  const [data, tournamentName, availableRounds] = await Promise.all([
    getMatches(tournamentId, resolvedSearchParams),
    getTournamentName(tournamentId),
    getAvailableRounds(tournamentId),
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
            <span className="text-zinc-300">Matches</span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Matches</h1>
            <p className="text-sm text-zinc-400">{tournamentName}</p>
          </div>
          <Link
            href={`/tournaments/${tournamentId}/admin/audit`}
            className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            View Audit Log
          </Link>
        </div>

        <ClientMatchesTable
          initialData={data}
          tournamentId={tournamentId}
          availableRounds={availableRounds}
          initialFilters={{
            state: resolvedSearchParams.state,
            round: resolvedSearchParams.round,
            playerName: resolvedSearchParams.playerName,
          }}
        />
      </div>
    </div>
  );
}
