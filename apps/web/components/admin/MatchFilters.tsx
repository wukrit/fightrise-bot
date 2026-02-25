'use client';

import { useState, useEffect } from 'react';
import * as Select from '@radix-ui/react-select';

type MatchState = 'NOT_STARTED' | 'CALLED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'PENDING_CONFIRMATION' | 'COMPLETED' | 'DISPUTED' | 'DQ';

interface RoundInfo {
  round: number;
  roundText: string;
}

interface MatchFiltersProps {
  filters: {
    state: string;
    round: string;
    playerName: string;
  };
  onFilterChange: (filters: { state: string; round: string; playerName: string }) => void;
  availableRounds: RoundInfo[];
}

const stateOptions: { value: MatchState; label: string }[] = [
  { value: 'NOT_STARTED', label: 'Not Started' },
  { value: 'CALLED', label: 'Called' },
  { value: 'CHECKED_IN', label: 'Checked In' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'PENDING_CONFIRMATION', label: 'Pending Confirmation' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'DISPUTED', label: 'Disputed' },
  { value: 'DQ', label: 'Disqualified' },
];

export function MatchFilters({ filters, onFilterChange, availableRounds }: MatchFiltersProps) {
  const [playerName, setPlayerName] = useState(filters.playerName);

  // Debounce player name search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (playerName !== filters.playerName) {
        onFilterChange({ ...filters, playerName });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [playerName]);

  const handleStateChange = (value: string) => {
    onFilterChange({ ...filters, state: value });
  };

  const handleRoundChange = (value: string) => {
    onFilterChange({ ...filters, round: value });
  };

  const clearFilters = () => {
    setPlayerName('');
    onFilterChange({ state: '', round: '', playerName: '' });
  };

  const hasFilters = filters.state || filters.round || filters.playerName;

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      {/* Player Search */}
      <div className="flex-1 min-w-[200px]">
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Search by player name..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-zinc-700"
        />
      </div>

      {/* State Filter */}
      <Select.Root value={filters.state} onValueChange={handleStateChange}>
        <Select.Trigger className="inline-flex items-center justify-between gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-600 min-w-[150px]">
          <Select.Value placeholder="All States" />
          <Select.Icon>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 4.5L6 7.5L9 4.5" />
            </svg>
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden">
            <Select.Viewport className="p-1">
              <Select.Item value="" className="flex items-center px-3 py-2 text-sm text-zinc-300 rounded hover:bg-zinc-800 cursor-pointer outline-none">
                <Select.ItemText>All States</Select.ItemText>
              </Select.Item>
              {stateOptions.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  className="flex items-center px-3 py-2 text-sm text-zinc-300 rounded hover:bg-zinc-800 cursor-pointer outline-none"
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>

      {/* Round Filter */}
      <Select.Root value={filters.round} onValueChange={handleRoundChange}>
        <Select.Trigger className="inline-flex items-center justify-between gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-600 min-w-[150px]">
          <Select.Value placeholder="All Rounds" />
          <Select.Icon>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 4.5L6 7.5L9 4.5" />
            </svg>
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden">
            <Select.Viewport className="p-1">
              <Select.Item value="" className="flex items-center px-3 py-2 text-sm text-zinc-300 rounded hover:bg-zinc-800 cursor-pointer outline-none">
                <Select.ItemText>All Rounds</Select.ItemText>
              </Select.Item>
              {availableRounds.map((r) => (
                <Select.Item
                  key={r.round}
                  value={String(r.round)}
                  className="flex items-center px-3 py-2 text-sm text-zinc-300 rounded hover:bg-zinc-800 cursor-pointer outline-none"
                >
                  <Select.ItemText>{r.roundText}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>

      {/* Clear Filters */}
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}
