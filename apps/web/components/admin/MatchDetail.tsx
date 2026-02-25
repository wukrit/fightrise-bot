'use client';

import * as Tooltip from '@radix-ui/react-tooltip';
import { MatchState } from '@fightrise/database';
import { getRelativeTime } from '@/lib/date-utils';

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

interface MatchDetailProps {
  match: Match;
  onDqPlayer: (player: MatchPlayer) => void;
}

function CheckInIcon({ isCheckedIn, checkedInAt, matchState }: { isCheckedIn: boolean; checkedInAt: string | null; matchState: MatchState }) {
  if (isCheckedIn && checkedInAt) {
    const timeAgo = getRelativeTime(checkedInAt);
    return (
      <Tooltip.Provider>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 8L6.5 11.5L13 4" />
              </svg>
            </span>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content className="bg-zinc-800 text-zinc-200 text-xs px-2 py-1 rounded shadow-lg">
              Checked in {timeAgo}
              <Tooltip.Arrow className="fill-zinc-800" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    );
  }

  if (matchState === 'CALLED' || matchState === 'CHECKED_IN') {
    return (
      <Tooltip.Provider>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <span className="inline-flex items-center gap-1 text-yellow-400">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="8" cy="8" r="6" />
                <path d="M8 4.5V8L10 9.5" />
              </svg>
            </span>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content className="bg-zinc-800 text-zinc-200 text-xs px-2 py-1 rounded shadow-lg">
              Waiting for check-in
              <Tooltip.Arrow className="fill-zinc-800" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-red-400">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 4L12 12M12 4L4 12" />
      </svg>
    </span>
  );
}

function PlayerRow({ player, isWinner, matchState, onDq }: { player: MatchPlayer; isWinner: boolean | null; matchState: MatchState; onDq: () => void }) {
  const displayName = player.user?.startggGamerTag || player.playerName || 'TBD';
  const discordName = player.user?.discordUsername;
  const hasDiscord = !!discordName;

  return (
    <div className="flex items-center justify-between py-3 px-4 bg-zinc-800/30 rounded-lg">
      <div className="flex items-center gap-3">
        {isWinner !== null && (
          <span
            className={`w-2 h-2 rounded-full ${isWinner ? 'bg-emerald-400' : 'bg-zinc-600'}`}
          />
        )}
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${isWinner === true ? 'text-emerald-400' : 'text-zinc-200'}`}>
              {displayName}
            </span>
            {isWinner === true && (
              <span className="text-xs text-emerald-500">(Winner)</span>
            )}
          </div>
          {hasDiscord && (
            <div className="flex items-center gap-2 mt-0.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-zinc-500">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
              </svg>
              <span className="text-xs text-zinc-500">{discordName}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <CheckInIcon isCheckedIn={player.isCheckedIn} checkedInAt={player.checkedInAt} matchState={matchState} />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDq();
          }}
          className="px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-900/20 rounded transition-colors"
        >
          DQ
        </button>
      </div>
    </div>
  );
}

export function MatchDetail({ match, onDqPlayer }: MatchDetailProps) {
  const player1 = match.players[0];
  const player2 = match.players[1];

  return (
    <div className="space-y-4">
      {/* Match Info Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/50">
        <div>
          <span className="text-sm font-medium text-zinc-200">{match.roundText}</span>
          <span className="text-xs text-zinc-500 ml-2">#{match.identifier}</span>
        </div>
        <div className="text-xs text-zinc-500">
          Match ID: {match.id.slice(0, 8)}
        </div>
      </div>

      {/* Players */}
      <div className="space-y-2">
        {player1 && (
          <PlayerRow
            player={player1}
            isWinner={player1.isWinner}
            matchState={match.state}
            onDq={() => onDqPlayer(player1)}
          />
        )}
        {player2 && (
          <PlayerRow
            player={player2}
            isWinner={player2.isWinner}
            matchState={match.state}
            onDq={() => onDqPlayer(player2)}
          />
        )}
        {(!player1 || !player2) && (
          <p className="text-sm text-zinc-500 text-center py-4">Waiting for players...</p>
        )}
      </div>

      {/* Check-in Details */}
      {match.state !== 'COMPLETED' && match.state !== 'DQ' && (
        <div className="pt-3 border-t border-zinc-800/50">
          <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Check-in Status</h4>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-zinc-400">Checked In</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
              <span className="text-zinc-400">Pending</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400"></span>
              <span className="text-zinc-400">Not Checked In</span>
            </div>
          </div>
          {match.checkInDeadline && (
            <p className="text-xs text-zinc-500 mt-2">
              Check-in deadline: {getRelativeTime(match.checkInDeadline)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
