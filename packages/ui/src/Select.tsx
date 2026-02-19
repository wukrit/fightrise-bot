import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
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
  cursor: 'pointer',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: '40px',
};

const focusStyles: React.CSSProperties = {
  borderColor: '#3b82f6',
  boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.15)',
};

const errorStyles: React.CSSProperties = {
  borderColor: '#ef4444',
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

export function Select({
  label,
  error,
  helperText,
  options,
  placeholder,
  style,
  onFocus,
  onBlur,
  id,
  ...props
}: SelectProps) {
  const generatedId = React.useId();
  const selectId = id || generatedId;

  const [isFocused, setIsFocused] = React.useState(false);

  const handleFocus = (e: React.FocusEvent<HTMLSelectElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLSelectElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const selectStyles: React.CSSProperties = {
    ...baseStyles,
    ...(error ? errorStyles : isFocused ? focusStyles : {}),
    ...style,
  };

  return (
    <div>
      {label && <label style={labelStyles} htmlFor={selectId}>{label}</label>}
      <select
        id={selectId}
        style={selectStyles}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <span style={errorTextStyles}>{error}</span>
      ) : helperText ? (
        <span style={helperStyles}>{helperText}</span>
      ) : null}
    </div>
  );
}
