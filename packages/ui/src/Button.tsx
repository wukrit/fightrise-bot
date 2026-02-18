import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'discord';
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles: Record<string, React.CSSProperties> = {
  primary: {
    backgroundColor: '#3b82f6',
    color: 'white',
  },
  secondary: {
    backgroundColor: '#6b7280',
    color: 'white',
  },
  danger: {
    backgroundColor: '#ef4444',
    color: 'white',
  },
  discord: {
    backgroundColor: '#5865F2',
    color: 'white',
  },
};

const sizeStyles: Record<string, React.CSSProperties> = {
  sm: {
    padding: '6px 12px',
    fontSize: '14px',
  },
  md: {
    padding: '10px 20px',
    fontSize: '16px',
  },
  lg: {
    padding: '14px 28px',
    fontSize: '18px',
  },
};

const baseStyles: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  border: 'none',
  borderRadius: '4px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'opacity 0.15s ease',
  outline: 'none',
};

const focusStyles: React.CSSProperties = {
  boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.5)',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  style,
  disabled,
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

  const combinedStyles: React.CSSProperties = {
    ...baseStyles,
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...(disabled ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
    ...(isFocused ? focusStyles : {}),
    ...style,
  };

  return (
    <button
      style={combinedStyles}
      disabled={disabled}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...props}
    >
      {children}
    </button>
  );
}
