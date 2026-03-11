import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { tokens } from './tokens.js';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'discord';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  asChild?: boolean;
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
};

// Focus styles for accessibility - using CSS :focus-visible in stylesheet
const focusVisibleStyles = `
  button:focus-visible, [role="button"]:focus-visible {
    outline: 2px solid ${tokens.colors.primary};
    outline-offset: 2px;
  }
`;

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  style,
  disabled,
  loading,
  asChild = false,
  onFocus,
  onBlur,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';

  const isDisabled = disabled || loading;

  const combinedStyles: React.CSSProperties = {
    ...baseStyles,
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...(isDisabled ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
    ...style,
  };

  return (
    <>
      <style>{focusVisibleStyles}</style>
      <Comp
        style={combinedStyles}
        disabled={isDisabled && !asChild}
        aria-disabled={isDisabled && asChild}
        onFocus={onFocus}
        onBlur={onBlur}
        {...props}
      >
        {loading && !asChild && (
          <span style={{ display: 'inline-block', width: tokens.spacing.md, height: tokens.spacing.md, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </span>
        )}
        {children}
      </Comp>
    </>
  );
}
