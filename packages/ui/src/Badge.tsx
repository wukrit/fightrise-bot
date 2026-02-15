import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  success: {
    backgroundColor: '#22c55e',
    color: '#ffffff',
  },
  warning: {
    backgroundColor: '#f59e0b',
    color: '#ffffff',
  },
  error: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
  },
  info: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
  },
  default: {
    backgroundColor: '#6b7280',
    color: '#ffffff',
  },
};

const sizeStyles: Record<string, React.CSSProperties> = {
  sm: {
    padding: '2px 8px',
    fontSize: '11px',
  },
  md: {
    padding: '4px 12px',
    fontSize: '13px',
  },
};

const baseStyles: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: '9999px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  style,
  ...props
}: BadgeProps) {
  const combinedStyles: React.CSSProperties = {
    ...baseStyles,
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...style,
  };

  return (
    <span style={combinedStyles} {...props}>
      {children}
    </span>
  );
}
