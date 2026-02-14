'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

// Types
type MatchStatus = 'NOT_STARTED' | 'CALLED' | 'IN_PROGRESS' | 'PENDING_CONFIRMATION' | 'COMPLETED' | 'DISPUTED';

interface Match {
  id: string;
  round: string;
  identifier: string;
  player1: string;
  player2: string;
  player1CheckedIn: boolean;
  player2CheckedIn: boolean;
  score: string | null;
  status: MatchStatus;
  threadId: string | null;
}

// Mock data
const mockMatches: Match[] = [
  { id: '1', round: 'Winners Quarterfinals', identifier: 'QF-1', player1: 'FighterPro', player2: 'StreetKing', player1CheckedIn: true, player2CheckedIn: true, score: '2-1', status: 'COMPLETED', threadId: '123' },
  { id: '2', round: 'Winners Quarterfinals', identifier: 'QF-2', player1: 'ComboMaster', player2: 'PixelNinja', player1CheckedIn: true, player2CheckedIn: false, score: null, status: 'CALLED', threadId: '124' },
  { id: '3', round: 'Winners Quarterfinals', identifier: 'QF-3', player1: 'ArcadeHero', player2: 'RetroGamer', player1CheckedIn: true, player2CheckedIn: true, score: '1-1', status: 'IN_PROGRESS', threadId: '125' },
  { id: '4', round: 'Winners Quarterfinals', identifier: 'QF-4', player1: 'NewChallenger', player2: 'ProGamer', player1CheckedIn: true, player2CheckedIn: true, score: null, status: 'NOT_STARTED', threadId: null },
  { id: '5', round: 'Losers Round 1', identifier: 'LR1-1', player1: 'Underdog', player2: 'Rookie', player1CheckedIn: true, player2CheckedIn: true, score: null, status: 'NOT_STARTED', threadId: null },
  { id: '6', round: 'Losers Round 1', identifier: 'LR1-2', player1: 'Veteran', player2: 'Amateur', player1CheckedIn: false, player2CheckedIn: true, score: null, status: 'CALLED', threadId: '126' },
];

// Utility functions
function StatusBadge({ status }: { status: MatchStatus }) {
  const statusConfig: Record<MatchStatus, { label: string; className: string; icon: string }> = {
    NOT_STARTED: { label: 'Not Started', className: 'bg-zinc-800 text-zinc-400 border-zinc-700', icon: '○' },
    CALLED: { label: 'Called', className: 'bg-amber-900/50 text-amber-400 border-amber-700/50', icon: '◐' },
    IN_PROGRESS: { label: 'In Progress', className: 'bg-rose-900/50 text-rose-400 border-rose-700/50 animate-pulse', icon: '●' },
    PENDING_CONFIRMATION: { label: 'Pending', className: 'bg-blue-900/50 text-blue-400 border-blue-700/50', icon: '◑' },
    COMPLETED: { label: 'Completed', className: 'bg-emerald-900/50 text-emerald-400 border-emerald-700/50', icon: '✓' },
    DISPUTED: { label: 'Disputed', className: 'bg-red-900/50 text-red-400 border-red-700/50', icon: '⚠' },
  };

  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${config.className}`}>
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}

function PlayerPill({ name, checkedIn }: { name: string; checkedIn: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${checkedIn ? 'bg-zinc-800' : 'bg-zinc-800/50'}`}>
      <span className={`w-2 h-2 rounded-full ${checkedIn ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
      <span className={`text-sm ${checkedIn ? 'text-zinc-200' : 'text-zinc-500'}`}>{name}</span>
      {checkedIn && <span className="text-xs text-emerald-400">✓</span>}
    </div>
  );
}

function MatchCard({ match }: { match: Match }) {
  return (
    <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4 hover:border-zinc-700/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-zinc-500 font-mono">{match.round}</p>
          <p className="text-sm font-medium text-zinc-300">{match.identifier}</p>
        </div>
        <StatusBadge status={match.status} />
      </div>

      <div className="flex items-center justify-between gap-4 mb-3">
        <PlayerPill name={match.player1} checkedIn={match.player1CheckedIn} />
        <span className="text-zinc-600 text-xs">vs</span>
        <PlayerPill name={match.player2} checkedIn={match.player2CheckedIn} />
      </div>

      {match.score && (
        <div className="mb-3 px-3 py-2 bg-zinc-800/50 rounded-lg">
          <p className="text-center text-lg font-bold text-zinc-200">{match.score}</p>
          {match.status === 'PENDING_CONFIRMATION' && (
            <p className="text-center text-xs text-amber-400 mt-1">Awaiting confirmation</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        {match.threadId ? (
          <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
            View Thread →
          </button>
        ) : (
          <span className="text-xs text-zinc-600">No thread</span>
        )}

        <button className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          Admin Actions
        </button>
      </div>
    </div>
  );
}

// Stats
function MatchStats({ matches }: { matches: Match[] }) {
  const stats = [
    { label: 'Total', value: matches.length, accent: '' },
    { label: 'Live', value: matches.filter(m => m.status === 'IN_PROGRESS').length, accent: 'text-rose-400' },
    { label: 'Called', value: matches.filter(m => m.status === 'CALLED').length, accent: 'text-amber-400' },
    { label: 'Pending', value: matches.filter(m => m.status === 'PENDING_CONFIRMATION').length, accent: 'text-blue-400' },
    { label: 'Done', value: matches.filter(m => m.status === 'COMPLETED').length, accent: 'text-emerald-400' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {stats.map(stat => (
        <div key={stat.label} className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg px-3 py-2">
          <span className={`text-xs text-zinc-500`}>{stat.label}</span>
          <span className={`ml-2 text-lg font-bold ${stat.accent || 'text-zinc-200'}`}>{stat.value}</span>
        </div>
      ))}
    </div>
  );
}

// Main component
export default function MatchesPage() {
  const params = useParams();
  const tournamentId = params.id as string;

  const [filterRound, setFilterRound] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<MatchStatus | 'all'>('all');

  // Get unique rounds
  const rounds = [...new Set(mockMatches.map(m => m.round))];

  // Filter matches
  const filteredMatches = mockMatches.filter(match => {
    if (filterRound !== 'all' && match.round !== filterRound) return false;
    if (filterStatus !== 'all' && match.status !== filterStatus) return false;
    return true;
  });

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
            <span className="text-zinc-300">Matches</span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Live indicator */}
        <div className="flex items-center gap-2 mb-6">
          <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
          <span className="text-sm text-zinc-400">Live updates enabled</span>
        </div>

        {/* Stats */}
        <div className="mb-6">
          <MatchStats matches={mockMatches} />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {/* Round Filter */}
          <select
            value={filterRound}
            onChange={(e) => setFilterRound(e.target.value)}
            className="bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-700"
          >
            <option value="all">All Rounds</option>
            {rounds.map(round => (
              <option key={round} value={round}>{round}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as MatchStatus | 'all')}
            className="bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-700"
          >
            <option value="all">All Status</option>
            <option value="NOT_STARTED">Not Started</option>
            <option value="CALLED">Called</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="PENDING_CONFIRMATION">Pending Confirmation</option>
            <option value="COMPLETED">Completed</option>
            <option value="DISPUTED">Disputed</option>
          </select>

          {/* Refresh button */}
          <button className="ml-auto px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Match Cards Grid */}
        {filteredMatches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMatches.map(match => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-zinc-500">No matches found</p>
            <p className="text-xs text-zinc-600 mt-1">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
