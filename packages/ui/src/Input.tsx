import React from 'react';
import { tokens } from './tokens.js';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const baseStyles: React.CSSProperties = {
  width: '100%',
  padding: `${tokens.spacing.sm} ${tokens.spacing.sm + 2}`,
  fontSize: '15px',
  border: `1px solid ${tokens.colors.border}`,
  borderRadius: tokens.borderRadius.md,
  backgroundColor: tokens.colors.white,
  color: tokens.colors.gray[900],
  outline: 'none',
  transition: tokens.transitions.fast,
};

const focusStyles: React.CSSProperties = {
  borderColor: tokens.colors.primary,
  boxShadow: `0 0 0 3px ${tokens.colors.primary}26`,
};

const errorStyles: React.CSSProperties = {
  borderColor: tokens.colors.danger,
};

const errorFocusStyles: React.CSSProperties = {
  borderColor: tokens.colors.danger,
  boxShadow: `0 0 0 3px ${tokens.colors.danger}26`,
};

const labelStyles: React.CSSProperties = {
  display: 'block',
  marginBottom: tokens.spacing.xs,
  fontSize: tokens.typography.fontSize.sm,
  fontWeight: tokens.typography.fontWeight.medium,
  color: tokens.colors.gray[900],
};

const helperStyles: React.CSSProperties = {
  marginTop: '4px',
  fontSize: tokens.typography.fontSize.sm,
  color: tokens.colors.gray[500],
};

const errorTextStyles: React.CSSProperties = {
  marginTop: '4px',
  fontSize: tokens.typography.fontSize.sm,
  color: tokens.colors.danger,
};

export function Input({
  label,
  error,
  helperText,
  style,
  onFocus,
  onBlur,
  id,
  ...props
}: InputProps) {
  const generatedId = React.useId();
  const inputId = id || generatedId;

  const [isFocused, setIsFocused] = React.useState(false);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const inputStyles: React.CSSProperties = {
    ...baseStyles,
    ...(error ? errorStyles : isFocused ? focusStyles : {}),
    ...(error && isFocused ? errorFocusStyles : {}),
    ...style,
  };

  return (
    <div>
      {label && <label style={labelStyles} htmlFor={inputId}>{label}</label>}
      <input
        id={inputId}
        style={inputStyles}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
      {error ? (
        <span style={errorTextStyles}>{error}</span>
      ) : helperText ? (
        <span style={helperStyles}>{helperText}</span>
      ) : null}
    </div>
  );
}
