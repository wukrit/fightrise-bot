'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Types
type MatchState = 'NOT_STARTED' | 'CALLED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'PENDING_CONFIRMATION' | 'COMPLETED' | 'DISPUTED' | 'DQ';

interface Match {
  id: string;
  tournamentId: string;
  tournamentName: string;
  round: number;
  bestOf: number;
  state: MatchState;
  opponent: {
    id: string;
    name: string;
    discordId: string;
  } | null;
  myReportedScore: number | null;
  isWinner: boolean | null;
}

// Status badge
function StatusBadge({ state }: { state: MatchState }) {
  const statusConfig: Record<MatchState, { label: string; className: string }> = {
    NOT_STARTED: { label: 'Pending', className: 'bg-zinc-800 text-zinc-400 border-zinc-700' },
    CALLED: { label: 'Called', className: 'bg-blue-900/50 text-blue-400 border-blue-700/50' },
    CHECKED_IN: { label: 'Checked In', className: 'bg-emerald-900/50 text-emerald-400 border-emerald-700/50' },
    IN_PROGRESS: { label: 'In Progress', className: 'bg-amber-900/50 text-amber-400 border-amber-700/50' },
    PENDING_CONFIRMATION: { label: 'Awaiting Confirm', className: 'bg-purple-900/50 text-purple-400 border-purple-700/50' },
    COMPLETED: { label: 'Completed', className: 'bg-slate-800 text-slate-400 border-slate-700' },
    DISPUTED: { label: 'Disputed', className: 'bg-red-900/50 text-red-400 border-red-700/50' },
    DQ: { label: 'Disqualified', className: 'bg-red-900/50 text-red-400 border-red-700/50' },
  };

  const config = statusConfig[state];

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${config.className}`}>
      {config.label}
    </span>
  );
}

// Match card
function MatchCard({ match }: { match: Match }) {
  const isPlayable = ['CALLED', 'CHECKED_IN', 'IN_PROGRESS', 'PENDING_CONFIRMATION'].includes(match.state);
  const isCompleted = match.state === 'COMPLETED';

  return (
    <Link
      href={`/matches/${match.id}`}
      className="group block bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5 hover:bg-zinc-900 hover:border-zinc-700/50 transition-all duration-300 ease-out"
    >
      <div className="flex items-start justify-between mb-3">
        <StatusBadge state={match.state} />
        <span className="text-xs text-zinc-500 font-mono">
          Best of {match.bestOf}
        </span>
      </div>

      <div className="mb-2">
        <h3 className="text-lg font-semibold text-zinc-100 group-hover:text-white transition-colors">
          {match.tournamentName}
        </h3>
        <p className="text-xs text-zinc-500 font-mono">
          Round {match.round}
        </p>
      </div>

      {match.opponent && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm text-zinc-400">vs</span>
          <span className="text-sm font-medium text-zinc-200">
            {match.opponent.name}
          </span>
        </div>
      )}

      {isCompleted && (
        <div className="text-sm">
          {match.isWinner === true && (
            <span className="text-emerald-400 font-medium">You won!</span>
          )}
          {match.isWinner === false && (
            <span className="text-red-400 font-medium">You lost</span>
          )}
          {match.myReportedScore !== null && (
            <span className="text-zinc-400 ml-2">
              Score: {match.myReportedScore}
            </span>
          )}
        </div>
      )}

      {isPlayable && (
        <div className="text-sm text-emerald-400">
          Action needed →
        </div>
      )}
    </Link>
  );
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMatches() {
      try {
        const response = await fetch('/api/matches');
        if (!response.ok) {
          if (response.status === 401) {
            // Not authenticated - show empty state
            setMatches([]);
            return;
          }
          throw new Error('Failed to fetch matches');
        }
        const data = await response.json();
        setMatches(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchMatches();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Loading matches...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="relative overflow-hidden bg-zinc-900/30 border-b border-zinc-800/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-800/20 via-zinc-950/0 to-zinc-950/0" />
        <div className="relative max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-4xl font-bold text-zinc-100 mb-2">My Matches</h1>
          <p className="text-zinc-400 text-lg">Your upcoming and recent matches</p>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-8">
        {matches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-zinc-600 text-lg mb-2">No matches found</div>
            <p className="text-zinc-500 text-sm">
              You don&apos;t have any matches yet. Register for a tournament to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
