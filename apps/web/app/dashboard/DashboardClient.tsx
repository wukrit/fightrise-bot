'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@fightrise/ui';

// Types matching the database schema
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

interface TournamentCardProps {
  tournament: Tournament;
}

interface DashboardStatsProps {
  totalTournaments: number;
  activeTournaments: number;
  upcomingTournaments: number;
}

// Status badge component with distinctive styling
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

// Format date nicely
function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'TBD';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Tournament card component with distinctive editorial design
function TournamentCard({ tournament }: TournamentCardProps) {
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
          View →
        </span>
      </div>
    </Link>
  );
}

// Stats component
function DashboardStats({ totalTournaments, activeTournaments, upcomingTournaments }: DashboardStatsProps) {
  const stats = [
    { label: 'Total Tournaments', value: totalTournaments, color: 'text-zinc-100' },
    { label: 'Live Now', value: activeTournaments, color: 'text-rose-400' },
    { label: 'Upcoming', value: upcomingTournaments, color: 'text-emerald-400' },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{stat.label}</p>
          <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

// Filter tabs component
type FilterTab = 'all' | 'live' | 'upcoming' | 'completed';
type SortOption = 'date-desc' | 'date-asc' | 'name';

function FilterBar({
  activeFilter,
  onFilterChange,
  sortOption,
  onSortChange,
}: {
  activeFilter: FilterTab;
  onFilterChange: (filter: FilterTab) => void;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
}) {
  const filters: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'live', label: 'Live' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'completed', label: 'Completed' },
  ];

  const sorts: { id: SortOption; label: string }[] = [
    { id: 'date-desc', label: 'Newest First' },
    { id: 'date-asc', label: 'Oldest First' },
    { id: 'name', label: 'A-Z' },
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div className="flex gap-1 p-1 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              activeFilter === filter.id
                ? 'bg-zinc-100 text-zinc-900'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <select
        value={sortOption}
        onChange={(e) => onSortChange(e.target.value as SortOption)}
        className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg px-4 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-700"
      >
        {sorts.map((sort) => (
          <option key={sort.id} value={sort.id}>
            {sort.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Loading skeleton
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="bg-zinc-900/30 border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="h-10 w-32 bg-zinc-800 rounded animate-pulse mb-2" />
          <div className="h-6 w-64 bg-zinc-800/50 rounded animate-pulse" />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-4">
              <div className="h-3 w-24 bg-zinc-800 rounded animate-pulse mb-1" />
              <div className="h-8 w-12 bg-zinc-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5">
              <div className="h-5 w-20 bg-zinc-800 rounded animate-pulse mb-3" />
              <div className="h-6 w-full bg-zinc-800 rounded animate-pulse mb-2" />
              <div className="h-4 w-3/4 bg-zinc-800 rounded animate-pulse mb-4" />
              <div className="h-4 w-1/2 bg-zinc-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Main dashboard content component - receives tournaments as props (server-fetched)
interface DashboardContentProps {
  initialTournaments: Tournament[];
}

function DashboardContent({ initialTournaments }: DashboardContentProps) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const tournaments = initialTournaments;

  // Filter tournaments
  const filteredTournaments = tournaments.filter((tournament) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'live') return tournament.state === 'IN_PROGRESS';
    if (activeFilter === 'upcoming') return ['REGISTRATION_OPEN', 'REGISTRATION_CLOSED'].includes(tournament.state);
    if (activeFilter === 'completed') return tournament.state === 'COMPLETED';
    return true;
  });

  // Sort tournaments
  const sortedTournaments = [...filteredTournaments].sort((a, b) => {
    if (sortOption === 'date-desc') {
      return new Date(b.startAt || 0).getTime() - new Date(a.startAt || 0).getTime();
    }
    if (sortOption === 'date-asc') {
      return new Date(a.startAt || 0).getTime() - new Date(b.startAt || 0).getTime();
    }
    if (sortOption === 'name') {
      return a.name.localeCompare(b.name);
    }
    return 0;
  });

  // Calculate stats
  const totalTournaments = tournaments.length;
  const activeTournaments = tournaments.filter((t) => t.state === 'IN_PROGRESS').length;
  const upcomingTournaments = tournaments.filter((t) =>
    ['REGISTRATION_OPEN', 'REGISTRATION_CLOSED'].includes(t.state)
  ).length;

  return (
    <div className="min-h-screen bg-zinc-950">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
          opacity: 0;
        }
      `}</style>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-zinc-900/30 border-b border-zinc-800/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-800/20 via-zinc-950/0 to-zinc-950/0" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-zinc-800/10 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-zinc-100 mb-2">Dashboard</h1>
              <p className="text-zinc-400 text-lg">Your tournaments, all in one place</p>
            </div>
            <Link
              href="/tournaments/new"
              className="px-5 py-2.5 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-400 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Tournament
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto px-6 py-8">
        <DashboardStats
          totalTournaments={totalTournaments}
          activeTournaments={activeTournaments}
          upcomingTournaments={upcomingTournaments}
        />

        <FilterBar
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          sortOption={sortOption}
          onSortChange={setSortOption}
        />

        {/* Tournament Grid */}
        {sortedTournaments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedTournaments.map((tournament, index) => (
              <div
                key={tournament.id}
                className="animate-fadeIn"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <TournamentCard tournament={tournament} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-zinc-600 text-lg mb-2">No tournaments found</div>
            <p className="text-zinc-500 text-sm">
              {activeFilter !== 'all'
                ? `No ${activeFilter} tournaments. Try a different filter.`
                : 'Join a tournament to get started.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Export the client component as default - tournaments will be passed from server component
export { DashboardContent, DashboardSkeleton };
