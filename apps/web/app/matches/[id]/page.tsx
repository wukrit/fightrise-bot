'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

// Types
type MatchState = 'NOT_STARTED' | 'CALLED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'PENDING_CONFIRMATION' | 'COMPLETED' | 'DISPUTED' | 'DQ';

interface Match {
  id: string;
  tournamentId: string;
  tournamentName: string;
  round: number;
  bestOf: number;
  state: MatchState;
  player1: {
    id: string;
    name: string;
    discordId: string;
    reportedScore: number | null;
    isWinner: boolean | null;
  } | null;
  player2: {
    id: string;
    name: string;
    discordId: string;
    reportedScore: number | null;
    isWinner: boolean | null;
  } | null;
  isPlayer1: boolean;
  myReportedScore: number | null;
  myIsWinner: boolean | null;
  gameResults: Array<{
    id: string;
    gameNumber: number;
    winnerId: string | null;
    player1Score: number;
    player2Score: number;
  }>;
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
    <span className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium border ${config.className}`}>
      {config.label}
    </span>
  );
}

export default function MatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [disputing, setDisputing] = useState(false);

  const matchId = params.id as string;

  useEffect(() => {
    async function fetchMatch() {
      try {
        const response = await fetch(`/api/matches/${matchId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Match not found');
            return;
          }
          if (response.status === 403) {
            setError('You are not authorized to view this match');
            return;
          }
          throw new Error('Failed to fetch match');
        }
        const data = await response.json();
        setMatch(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchMatch();
  }, [matchId]);

  const handleReportScore = async (winnerId: string) => {
    if (!match) return;

    const player1Score = winnerId === match.player1?.id ? match.bestOf : 0;
    const player2Score = winnerId === match.player2?.id ? match.bestOf : 0;

    setReporting(true);
    try {
      const response = await fetch(`/api/matches/${matchId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winnerId,
          player1Score,
          player2Score,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to report score');
      }

      // Refresh match data
      const response2 = await fetch(`/api/matches/${matchId}`);
      const data = await response2.json();
      setMatch(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to report score');
    } finally {
      setReporting(false);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const response = await fetch(`/api/matches/${matchId}/confirm`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to confirm result');
      }

      // Refresh match data
      const response2 = await fetch(`/api/matches/${matchId}`);
      const data = await response2.json();
      setMatch(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm');
    } finally {
      setConfirming(false);
    }
  };

  const handleDispute = async () => {
    const reason = prompt('Please enter a reason for the dispute:');
    if (!reason) return;

    setDisputing(true);
    try {
      const response = await fetch(`/api/matches/${matchId}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        throw new Error('Failed to create dispute');
      }

      // Refresh match data
      const response2 = await fetch(`/api/matches/${matchId}`);
      const data = await response2.json();
      setMatch(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to dispute');
    } finally {
      setDisputing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Loading match...</div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-4">{error || 'Match not found'}</div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-zinc-800 text-zinc-200 rounded-lg hover:bg-zinc-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const isPendingConfirmation = match.state === 'PENDING_CONFIRMATION';
  const isPlayable = ['CALLED', 'CHECKED_IN', 'IN_PROGRESS'].includes(match.state);
  const isCompleted = match.state === 'COMPLETED';

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="relative overflow-hidden bg-zinc-900/30 border-b border-zinc-800/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-800/20 via-zinc-950/0 to-zinc-950/0" />
        <div className="relative max-w-7xl mx-auto px-6 py-8">
          <button
            onClick={() => router.back()}
            className="text-zinc-400 hover:text-zinc-200 mb-4 flex items-center gap-2"
          >
            ← Back
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-100 mb-2">{match.tournamentName}</h1>
              <p className="text-zinc-400">Round {match.round} • Best of {match.bestOf}</p>
            </div>
            <StatusBadge state={match.state} />
          </div>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-8">
        {/* Match Players */}
        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-zinc-100 mb-6">Match</h2>

          <div className="flex items-center justify-between gap-8">
            {/* Player 1 */}
            <div className="flex-1 text-center">
              <div className="text-lg font-medium text-zinc-100 mb-1">
                {match.player1?.name || 'TBD'}
              </div>
              <div className="text-sm text-zinc-500">
                {match.isPlayer1 ? '(You)' : ''}
              </div>
              {match.player1?.reportedScore !== null && match.player1 && (
                <div className="mt-2 text-2xl font-bold text-zinc-300">
                  {match.player1.reportedScore}
                </div>
              )}
            </div>

            <div className="text-zinc-500 text-xl font-bold">VS</div>

            {/* Player 2 */}
            <div className="flex-1 text-center">
              <div className="text-lg font-medium text-zinc-100 mb-1">
                {match.player2?.name || 'TBD'}
              </div>
              <div className="text-sm text-zinc-500">
                {!match.isPlayer1 ? '(You)' : ''}
              </div>
              {match.player2?.reportedScore !== null && match.player2 && (
                <div className="mt-2 text-2xl font-bold text-zinc-300">
                  {match.player2.reportedScore}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Game Results */}
        {match.gameResults.length > 0 && (
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-zinc-100 mb-4">Games</h2>
            <div className="space-y-2">
              {match.gameResults.map((game) => (
                <div key={game.id} className="flex items-center justify-between py-2 border-b border-zinc-800">
                  <span className="text-zinc-400">Game {game.gameNumber}</span>
                  <span className="text-zinc-200">
                    {game.player1Score} - {game.player2Score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {isPlayable && (
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-zinc-100 mb-4">Report Result</h2>
            <p className="text-zinc-400 mb-4">Did you win or lose this match?</p>
            <div className="flex gap-4">
              {match.player1 && (
                <button
                  onClick={() => handleReportScore(match.player1!.id)}
                  disabled={reporting}
                  className="flex-1 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-500 disabled:opacity-50"
                >
                  {reporting ? 'Reporting...' : `I beat ${match.player2?.name || 'Player 2'}`}
                </button>
              )}
              {match.player2 && (
                <button
                  onClick={() => handleReportScore(match.player2!.id)}
                  disabled={reporting}
                  className="flex-1 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-500 disabled:opacity-50"
                >
                  {reporting ? 'Reporting...' : `I lost to ${match.player1?.name || 'Player 1'}`}
                </button>
              )}
            </div>
          </div>
        )}

        {isPendingConfirmation && (
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-6 mt-6">
            <h2 className="text-xl font-semibold text-zinc-100 mb-4">Confirm Result</h2>
            <p className="text-zinc-400 mb-4">
              Your opponent reported the result. Please confirm if you agree.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="flex-1 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-500 disabled:opacity-50"
              >
                {confirming ? 'Confirming...' : 'Confirm Result'}
              </button>
              <button
                onClick={handleDispute}
                disabled={disputing}
                className="flex-1 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-500 disabled:opacity-50"
              >
                {disputing ? 'Filing...' : 'Dispute'}
              </button>
            </div>
          </div>
        )}

        {isCompleted && (
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-6 mt-6 text-center">
            <div className="text-lg font-medium text-zinc-100">
              Match Complete
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
