import React from 'react';
import { tokens } from './tokens.js';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'discord';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variantStyles: Record<string, React.CSSProperties> = {
  primary: {
    backgroundColor: tokens.colors.primary,
    color: tokens.colors.white,
  },
  secondary: {
    backgroundColor: tokens.colors.secondary,
    color: tokens.colors.white,
  },
  danger: {
    backgroundColor: tokens.colors.danger,
    color: tokens.colors.white,
  },
  discord: {
    backgroundColor: tokens.colors.discord,
    color: tokens.colors.white,
  },
};

const sizeStyles: Record<string, React.CSSProperties> = {
  sm: {
    padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
    fontSize: tokens.typography.fontSize.sm,
  },
  md: {
    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
    fontSize: tokens.typography.fontSize.base,
  },
  lg: {
    padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
    fontSize: tokens.typography.fontSize.lg,
  },
};

const baseStyles: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: tokens.spacing.sm,
  border: 'none',
  borderRadius: tokens.borderRadius.sm,
  fontWeight: tokens.typography.fontWeight.medium,
  cursor: 'pointer',
  transition: tokens.transitions.fast,
  outline: 'none',
};

const focusStyles: React.CSSProperties = {
  boxShadow: `0 0 0 3px ${tokens.colors.primary}40`,
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  style,
  disabled,
  loading,
  onFocus,
  onBlur,
  ...props
}: ButtonProps) {
  const [isFocused, setIsFocused] = React.useState(false);

  const handleFocus = (e: React.FocusEvent<HTMLButtonElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLButtonElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const isDisabled = disabled || loading;

  const combinedStyles: React.CSSProperties = {
    ...baseStyles,
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...(isDisabled ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
    ...(isFocused ? focusStyles : {}),
    ...style,
  };

  return (
    <button
      style={combinedStyles}
      disabled={isDisabled}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...props}
    >
      {loading && (
        <span style={{ display: 'inline-block', width: tokens.spacing.md, height: tokens.spacing.md, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </span>
      )}
      {children}
    </button>
  );
}
