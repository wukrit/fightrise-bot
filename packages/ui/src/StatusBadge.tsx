import React from 'react';

// Tournament state types (matches Prisma enum)
export type TournamentState =
  | 'CREATED'
  | 'REGISTRATION_OPEN'
  | 'REGISTRATION_CLOSED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  state: TournamentState;
  showPulse?: boolean;
}

const statusConfig: Record<TournamentState, { label: string; className: string }> = {
  CREATED: {
    label: 'Draft',
    className: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  },
  REGISTRATION_OPEN: {
    label: 'Registration Open',
    className: 'bg-emerald-900/50 text-emerald-400 border-emerald-700/50',
  },
  REGISTRATION_CLOSED: {
    label: 'Registration Closed',
    className: 'bg-amber-900/50 text-amber-400 border-amber-700/50',
  },
  IN_PROGRESS: {
    label: 'Live',
    className: 'bg-rose-900/50 text-rose-400 border-rose-700/50 animate-pulse',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-slate-800 text-slate-400 border-slate-700',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-red-900/30 text-red-400 border-red-800/50',
  },
};

export function StatusBadge({
  state,
  showPulse = true,
  className,
  ...props
}: StatusBadgeProps) {
  const config = statusConfig[state];
  const isLive = state === 'IN_PROGRESS' && showPulse;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${config.className} ${className || ''}`}
      {...props}
    >
      {isLive && (
        <span className="w-1.5 h-1.5 bg-rose-400 rounded-full mr-1.5 animate-ping" />
      )}
      {config.label}
    </span>
  );
}
