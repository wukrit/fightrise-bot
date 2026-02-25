'use client';

import { useState } from 'react';
import { MatchDetail } from './MatchDetail';
import { DQModal } from './DQModal';
import { MatchState } from '@fightrise/database';

// Local type matching the API response shape
interface User {
  id: string;
  discordId: string | null;
  discordUsername: string | null;
  startggId: string | null;
  startggGamerTag: string | null;
}

interface MatchPlayer {
  id: string;
  playerName: string;
  isCheckedIn: boolean;
  checkedInAt: string | null;
  reportedScore: number | null;
  isWinner: boolean | null;
  user: User | null;
}

interface Match {
  id: string;
  identifier: string;
  roundText: string;
  round: number;
  state: MatchState;
  checkInDeadline: string | null;
  createdAt: string;
  updatedAt: string;
  event: {
    id: string;
    name: string;
    tournamentId: string;
  };
  players: MatchPlayer[];
}

interface MatchesTableProps {
  matches: Match[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  loading: boolean;
  tournamentId: string;
  onDqPlayer: (matchId: string, playerId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  onRefresh: () => void;
}

function getStateConfig(state: MatchState): { label: string; className: string } {
  const config: Record<MatchState, { label: string; className: string }> = {
    NOT_STARTED: { label: 'Not Started', className: 'bg-zinc-800 text-zinc-400 border-zinc-700' },
    CALLED: { label: 'Called', className: 'bg-blue-900/50 text-blue-400 border-blue-700/50' },
    CHECKED_IN: { label: 'Checked In', className: 'bg-cyan-900/50 text-cyan-400 border-cyan-700/50' },
    IN_PROGRESS: { label: 'In Progress', className: 'bg-yellow-900/50 text-yellow-400 border-yellow-700/50' },
    PENDING_CONFIRMATION: { label: 'Pending', className: 'bg-orange-900/50 text-orange-400 border-orange-700/50' },
    COMPLETED: { label: 'Completed', className: 'bg-emerald-900/50 text-emerald-400 border-emerald-700/50' },
    DISPUTED: { label: 'Disputed', className: 'bg-red-900/50 text-red-400 border-red-700/50' },
    DQ: { label: 'DQ', className: 'bg-red-900/50 text-red-400 border-red-700/50' },
  };
  return config[state];
}

function formatScore(players: Match['players']): string {
  const winner = players.find((p) => p.isWinner === true);
  const loser = players.find((p) => p.isWinner === false);

  if (!winner || !loser) return '-';

  // If we have reported scores, show them
  const winnerScore = winner.reportedScore ?? 0;
  const loserScore = loser.reportedScore ?? 0;

  return `${winnerScore}-${loserScore}`;
}

function getCheckInSummary(players: Match['players']): string {
  const checkedIn = players.filter((p) => p.isCheckedIn).length;
  return `${checkedIn}/${players.length} checked in`;
}

export function MatchesTable({
  matches,
  pagination,
  loading,
  tournamentId,
  onDqPlayer,
  onRefresh,
}: MatchesTableProps) {
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [dqModalOpen, setDqModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Match['players'][0] | null>(null);
  const [dqLoading, setDqLoading] = useState(false);
  const [dqError, setDqError] = useState('');

  const toggleExpand = (matchId: string) => {
    setExpandedMatch((prev) => (prev === matchId ? null : matchId));
  };

  const openDqModal = (match: Match, player: Match['players'][0]) => {
    setSelectedMatch(match);
    setSelectedPlayer(player);
    setDqError('');
    setDqModalOpen(true);
  };

  const handleDqConfirm = async (reason?: string) => {
    if (!selectedMatch || !selectedPlayer) return;

    setDqLoading(true);
    setDqError('');

    try {
      const result = await onDqPlayer(selectedMatch.id, selectedPlayer.id, reason);
      if (result.success) {
        setDqModalOpen(false);
        setSelectedMatch(null);
        setSelectedPlayer(null);
        onRefresh();
      } else {
        setDqError(result.error || 'Failed to disqualify player');
      }
    } catch (err) {
      setDqError('An unexpected error occurred');
    } finally {
      setDqLoading(false);
    }
  };

  if (matches.length === 0 && !loading) {
    return (
      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-12 text-center">
        <p className="text-zinc-500">No matches found</p>
        <p className="text-sm text-zinc-600 mt-2">Matches will appear here once the tournament starts</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider w-8"></th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Round</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Player 1</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Player 2</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Score</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/30">
            {matches.map((match) => {
              const isExpanded = expandedMatch === match.id;
              const stateConfig = getStateConfig(match.state);
              const player1 = match.players[0];
              const player2 = match.players[1];

              return (
                <>
                  <tr
                    key={match.id}
                    className={`hover:bg-zinc-800/20 transition-colors cursor-pointer ${isExpanded ? 'bg-zinc-800/10' : ''}`}
                    onClick={() => toggleExpand(match.id)}
                  >
                    <td className="px-4 py-3">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className={`text-zinc-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      >
                        <path d="M6 4L10 8L6 12" />
                      </svg>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-sm font-medium text-zinc-200">{match.roundText}</span>
                        <span className="text-xs text-zinc-500 ml-2">#{match.identifier}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-zinc-300">
                        {player1?.user?.startggGamerTag || player1?.playerName || 'TBD'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-zinc-300">
                        {player2?.user?.startggGamerTag || player2?.playerName || 'TBD'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-zinc-400 font-mono">{formatScore(match.players)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${stateConfig.className}`}>
                          {stateConfig.label}
                        </span>
                        <span className="text-xs text-zinc-500">{getCheckInSummary(match.players)}</span>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${match.id}-detail`}>
                      <td colSpan={6} className="px-4 py-4 bg-zinc-900/20">
                        <MatchDetail
                          match={match}
                          onDqPlayer={(player) => openDqModal(match, player)}
                        />
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>

        {loading && (
          <div className="absolute inset-0 bg-zinc-950/50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-400"></div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => {
              const params = new URLSearchParams();
              params.set('page', String(pagination.page - 1));
              window.location.search = params.toString();
            }}
            disabled={pagination.page <= 1}
            className="px-3 py-1.5 text-sm bg-zinc-800 text-zinc-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700"
          >
            Previous
          </button>
          <span className="text-sm text-zinc-400">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => {
              const params = new URLSearchParams();
              params.set('page', String(pagination.page + 1));
              window.location.search = params.toString();
            }}
            disabled={pagination.page >= pagination.totalPages}
            className="px-3 py-1.5 text-sm bg-zinc-800 text-zinc-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700"
          >
            Next
          </button>
        </div>
      )}

      {/* DQ Modal */}
      <DQModal
        isOpen={dqModalOpen}
        onClose={() => setDqModalOpen(false)}
        onConfirm={handleDqConfirm}
        loading={dqLoading}
        error={dqError}
        playerName={selectedPlayer?.user?.startggGamerTag || selectedPlayer?.playerName || 'Player'}
        matchIdentifier={selectedMatch?.identifier || ''}
      />
    </>
  );
}
