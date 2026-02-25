'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { MatchesTable } from './MatchesTable';
import { MatchFilters } from './MatchFilters';

type MatchState = 'NOT_STARTED' | 'CALLED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'PENDING_CONFIRMATION' | 'COMPLETED' | 'DISPUTED' | 'DQ';

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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface RoundInfo {
  round: number;
  roundText: string;
}

interface ClientMatchesTableProps {
  initialData: {
    matches: Match[];
    pagination: Pagination;
  };
  tournamentId: string;
  availableRounds: RoundInfo[];
  initialFilters?: {
    state?: string;
    round?: string;
    playerName?: string;
  };
}

export function ClientMatchesTable({
  initialData,
  tournamentId,
  availableRounds,
  initialFilters,
}: ClientMatchesTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [matches, setMatches] = useState(initialData.matches);
  const [pagination, setPagination] = useState(initialData.pagination);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    state: initialFilters?.state || '',
    round: initialFilters?.round || '',
    playerName: initialFilters?.playerName || '',
  });

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.state) params.set('state', filters.state);
      if (filters.round) params.set('round', filters.round);
      if (filters.playerName) params.set('playerName', filters.playerName);
      params.set('refresh', String(Date.now()));

      const response = await fetch(
        `/api/tournaments/${tournamentId}/admin/matches?${params.toString()}`,
        { cache: 'no-store' }
      );

      if (response.ok) {
        const data = await response.json();
        setMatches(data.matches);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch matches:', error);
    } finally {
      setLoading(false);
    }
  }, [tournamentId, filters.state, filters.round, filters.playerName]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMatches();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchMatches]);

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);

    const params = new URLSearchParams();
    if (newFilters.state) params.set('state', newFilters.state);
    if (newFilters.round) params.set('round', newFilters.round);
    if (newFilters.playerName) params.set('playerName', newFilters.playerName);

    router.push(`/tournaments/${tournamentId}/admin/matches?${params.toString()}`);
  };

  const handleDqPlayer = async (matchId: string, playerId: string, reason?: string) => {
    const response = await fetch(
      `/api/tournaments/${tournamentId}/admin/players/${playerId}/dq`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, reason }),
      }
    );

    if (response.ok) {
      // Refresh data after DQ
      await fetchMatches();
      return { success: true };
    } else {
      const error = await response.json();
      return { success: false, error: error.error || 'Failed to disqualify player' };
    }
  };

  return (
    <div>
      <MatchFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        availableRounds={availableRounds}
      />

      <MatchesTable
        matches={matches}
        pagination={pagination}
        loading={loading}
        tournamentId={tournamentId}
        onDqPlayer={handleDqPlayer}
        onRefresh={fetchMatches}
      />
    </div>
  );
}
