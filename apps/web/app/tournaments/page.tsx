import Link from 'next/link';
import { prisma } from '@fightrise/database';

// Types
type TournamentState = 'CREATED' | 'REGISTRATION_OPEN' | 'REGISTRATION_CLOSED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

interface Tournament {
  id: string;
  name: string;
  startggSlug: string;
  startAt: string | null;
  endAt: string | null;
  state: TournamentState;
  _count?: {
    registrations: number;
  };
}

// Status badge component
function StatusBadge({ state }: { state: TournamentState }) {
  const statusConfig: Record<TournamentState, { label: string; className: string }> = {
    CREATED: { label: 'Draft', className: 'bg-zinc-800 text-zinc-400 border-zinc-700' },
    REGISTRATION_OPEN: { label: 'Registration Open', className: 'bg-emerald-900/50 text-emerald-400 border-emerald-700/50' },
    REGISTRATION_CLOSED: { label: 'Registration Closed', className: 'bg-amber-900/50 text-amber-400 border-amber-700/50' },
    IN_PROGRESS: { label: 'Live', className: 'bg-rose-900/50 text-rose-400 border-rose-700/50 animate-pulse' },
    COMPLETED: { label: 'Completed', className: 'bg-slate-800 text-slate-400 border-slate-700' },
    CANCELLED: { label: 'Cancelled', className: 'bg-red-900/30 text-red-400 border-red-800/50' },
  };

  const config = statusConfig[state];

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${config.className}`}>
      {state === 'IN_PROGRESS' && (
        <span className="w-1.5 h-1.5 bg-rose-400 rounded-full mr-1.5 animate-ping" />
      )}
      {config.label}
    </span>
  );
}

// Format date
function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'TBD';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Tournament card
function TournamentCard({ tournament }: { tournament: Tournament }) {
  return (
    <Link
      href={`/tournaments/${tournament.id}`}
      className="group block bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5 hover:bg-zinc-900 hover:border-zinc-700/50 transition-all duration-300 ease-out"
    >
      <div className="flex items-start justify-between mb-3">
        <StatusBadge state={tournament.state} />
        {tournament._count && (
          <span className="text-xs text-zinc-500 font-mono">
            {tournament._count.registrations} entrants
          </span>
        )}
      </div>

      <h3 className="text-lg font-semibold text-zinc-100 group-hover:text-white transition-colors mb-2 line-clamp-2">
        {tournament.name}
      </h3>

      <p className="text-xs text-zinc-500 font-mono mb-4">
        {tournament.startggSlug}
      </p>

      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-400">
          {formatDate(tournament.startAt)}
        </span>
        <span className="text-zinc-600 group-hover:text-zinc-300 transition-colors">
          View -&gt;
        </span>
      </div>
    </Link>
  );
}

// Server component to fetch tournaments
async function getTournaments(): Promise<Tournament[]> {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { startAt: 'desc' },
    include: {
      _count: {
        select: { registrations: true },
      },
    },
  });

  return tournaments as Tournament[];
}

export default async function TournamentsPage() {
  const tournaments = await getTournaments();

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="relative overflow-hidden bg-zinc-900/30 border-b border-zinc-800/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-800/20 via-zinc-950/0 to-zinc-950/0" />
        <div className="relative max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-4xl font-bold text-zinc-100 mb-2">Tournaments</h1>
          <p className="text-zinc-400 text-lg">Find and join tournaments</p>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-8">
        {tournaments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-zinc-600 text-lg mb-2">No tournaments found</div>
            <p className="text-zinc-500 text-sm">
              There are no tournaments available at the moment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
