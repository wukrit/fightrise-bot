import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const baseStyles: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  fontSize: '15px',
  border: '1px solid var(--color-border, #e5e5e5)',
  borderRadius: '6px',
  backgroundColor: 'var(--color-bg, #ffffff)',
  color: 'var(--color-text, #1a1a1a)',
  outline: 'none',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
};

const focusStyles: React.CSSProperties = {
  borderColor: '#3b82f6',
  boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.15)',
};

const errorStyles: React.CSSProperties = {
  borderColor: '#ef4444',
};

const errorFocusStyles: React.CSSProperties = {
  borderColor: '#ef4444',
  boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.15)',
};

const labelStyles: React.CSSProperties = {
  display: 'block',
  marginBottom: '6px',
  fontSize: '14px',
  fontWeight: 500,
  color: 'var(--color-text, #1a1a1a)',
};

const helperStyles: React.CSSProperties = {
  marginTop: '4px',
  fontSize: '13px',
  color: '#6b7280',
};

const errorTextStyles: React.CSSProperties = {
  marginTop: '4px',
  fontSize: '13px',
  color: '#ef4444',
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
