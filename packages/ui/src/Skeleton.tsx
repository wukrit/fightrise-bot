import React from 'react';

export interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  style?: React.CSSProperties;
}

const shimmerGradient = `
  linear-gradient(
    90deg,
    var(--color-skeleton-base, #e5e5e5) 0%,
    var(--color-skeleton-highlight, #f0f0f0) 50%,
    var(--color-skeleton-base, #e5e5e5) 100%
  )
`;

const baseStyles: React.CSSProperties = {
  background: shimmerGradient,
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
  borderRadius: '4px',
};

export function Skeleton({ width = '100%', height = '20px', borderRadius, style }: SkeletonProps) {
  const combinedStyles: React.CSSProperties = {
    ...baseStyles,
    width,
    height,
    borderRadius,
    ...style,
  };

  return <div style={combinedStyles} />;
}

export interface SkeletonTextProps {
  lines?: number;
  spacing?: string;
}

const textLineStyles: React.CSSProperties = {
  height: '16px',
  marginBottom: '8px',
};

export function SkeletonText({ lines = 3, spacing = '8px' }: SkeletonTextProps) {
  return (
    <div>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? '70%' : '100%'}
          height="16px"
          style={{ marginBottom: i === lines - 1 ? 0 : spacing }}
        />
      ))}
    </div>
  );
}

export interface SkeletonAvatarProps {
  size?: 'sm' | 'md' | 'lg';
}

const avatarSizes: Record<string, string> = {
  sm: '32px',
  md: '48px',
  lg: '64px',
};

export function SkeletonAvatar({ size = 'md' }: SkeletonAvatarProps) {
  return (
    <Skeleton
      width={avatarSizes[size]}
      height={avatarSizes[size]}
      borderRadius="50%"
    />
  );
}

export interface SkeletonCardProps {
  showHeader?: boolean;
  showFooter?: boolean;
}

const cardStyles: React.CSSProperties = {
  border: '1px solid var(--color-border, #e5e5e5)',
  borderRadius: '8px',
  padding: '20px',
};

export function SkeletonCard({ showHeader = true, showFooter = true }: SkeletonCardProps) {
  return (
    <div style={cardStyles}>
      {showHeader && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <SkeletonAvatar size="md" />
          <div style={{ flex: 1 }}>
            <Skeleton width="60%" height="16px" style={{ marginBottom: '4px' }} />
            <Skeleton width="40%" height="12px" />
          </div>
        </div>
      )}
      <SkeletonText lines={3} />
      {showFooter && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
          <Skeleton width="80px" height="36px" borderRadius="6px" />
          <Skeleton width="80px" height="36px" borderRadius="6px" />
        </div>
      )}
    </div>
  );
}

export interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

const tableStyles: React.CSSProperties = {
  border: '1px solid var(--color-border, #e5e5e5)',
  borderRadius: '8px',
  overflow: 'hidden',
};

const theadStyles: React.CSSProperties = {
  backgroundColor: 'var(--color-bg-secondary, #f9fafb)',
  padding: '12px 16px',
};

const tdStyles: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid var(--color-border, #e5e5e5)',
};

export function SkeletonTable({ rows = 5, columns = 4 }: SkeletonTableProps) {
  return (
    <div style={tableStyles}>
      <div style={theadStyles}>
        <div style={{ display: 'flex', gap: '16px' }}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} width="100px" height="16px" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} style={tdStyles}>
          <div style={{ display: 'flex', gap: '16px' }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} width="100%" height="16px" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
