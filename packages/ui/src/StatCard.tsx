import React from 'react';

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  accent?: string;
  icon?: React.ReactNode;
}

export function StatCard({
  label,
  value,
  trend,
  trendDirection = 'neutral',
  accent,
  icon,
  className,
  style,
  ...props
}: StatCardProps) {
  const trendColors: Record<string, string> = {
    up: 'text-emerald-400',
    down: 'text-red-400',
    neutral: 'text-zinc-500',
  };

  const trendBgColors: Record<string, string> = {
    up: 'bg-emerald-900/30',
    down: 'bg-red-900/30',
    neutral: 'bg-zinc-800/30',
  };

  return (
    <div
      className={className}
      style={{
        backgroundColor: 'rgba(24, 24, 27, 0.3)',
        border: '1px solid rgba(63, 63, 70, 0.5)',
        borderRadius: '8px',
        padding: '16px',
        ...style,
      }}
      {...props}
    >
      <div className="flex items-start justify-between">
        <p
          style={{
            fontSize: '12px',
            color: '#71717a',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            margin: 0,
          }}
        >
          {label}
        </p>
        {icon && <div className="text-zinc-500">{icon}</div>}
      </div>
      <p
        style={{
          fontSize: '24px',
          fontWeight: 700,
          marginTop: '4px',
          color: accent || '#f4f4f5',
        }}
      >
        {value}
      </p>
      {trend && (
        <p
          className={trendColors[trendDirection]}
          style={{
            fontSize: '12px',
            marginTop: '4px',
          }}
        >
          {trend}
        </p>
      )}
    </div>
  );
}
