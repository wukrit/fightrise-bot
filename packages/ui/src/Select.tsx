import React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { tokens } from './tokens.js';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  onChange?: (e: { target: { value: string } }) => void; // Backward compatibility
  disabled?: boolean;
  id?: string;
  style?: React.CSSProperties;
}

const triggerStyles: React.CSSProperties = {
  width: '100%',
  padding: `${tokens.spacing.sm} ${tokens.spacing.sm + 2}`,
  fontSize: '15px',
  border: `1px solid ${tokens.colors.border}`,
  borderRadius: tokens.borderRadius.md,
  backgroundColor: tokens.colors.white,
  color: tokens.colors.gray[900],
  outline: 'none',
  cursor: 'pointer',
  transition: tokens.transitions.fast,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const triggerFocusStyles: React.CSSProperties = {
  borderColor: tokens.colors.primary,
  boxShadow: `0 0 0 3px ${tokens.colors.primary}26`,
};

const triggerErrorStyles: React.CSSProperties = {
  borderColor: tokens.colors.danger,
};

const triggerDisabledStyles: React.CSSProperties = {
  opacity: 0.6,
  cursor: 'not-allowed',
  backgroundColor: tokens.colors.gray[100],
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

const contentStyles: React.CSSProperties = {
  backgroundColor: tokens.colors.white,
  borderRadius: tokens.borderRadius.md,
  boxShadow: tokens.shadows.lg,
  border: `1px solid ${tokens.colors.border}`,
  overflow: 'hidden',
  zIndex: tokens.zIndex.dropdown,
  animation: 'slideUp 150ms ease',
};

const itemStyles: React.CSSProperties = {
  padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
  fontSize: '15px',
  color: tokens.colors.gray[900],
  cursor: 'pointer',
  outline: 'none',
  display: 'flex',
  alignItems: 'center',
};

const itemFocusStyles: React.CSSProperties = {
  backgroundColor: tokens.colors.gray[100],
};

const itemDisabledStyles: React.CSSProperties = {
  color: tokens.colors.gray[400],
  cursor: 'not-allowed',
};

const scrollButtonStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '25px',
  backgroundColor: tokens.colors.white,
  color: tokens.colors.gray[500],
  cursor: 'default',
};

function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function Select({
  label,
  error,
  helperText,
  options,
  placeholder = 'Select an option',
  value,
  onValueChange,
  onChange,
  disabled = false,
  id,
  style,
}: SelectProps) {
  const generatedId = React.useId();
  const selectId = id || generatedId;

  const getTriggerStyle = (isFocused: boolean, customStyle?: React.CSSProperties): React.CSSProperties => {
    let style = { ...triggerStyles };
    if (error) {
      Object.assign(style, triggerErrorStyles);
    } else if (isFocused) {
      Object.assign(style, triggerFocusStyles);
    }
    if (disabled) {
      Object.assign(style, triggerDisabledStyles);
    }
    if (customStyle) {
      Object.assign(style, customStyle);
    }
    return style;
  };

  const handleValueChange = (newValue: string) => {
    onValueChange?.(newValue);
    // Backward compatibility: call onChange with a synthetic event
    onChange?.({ target: { value: newValue } });
  };

  return (
    <div>
      {label && <label style={labelStyles} htmlFor={selectId}>{label}</label>}
      <SelectPrimitive.Root value={value} onValueChange={handleValueChange} disabled={disabled}>
        <SelectPrimitive.Trigger
          id={selectId}
          style={getTriggerStyle(false, style)}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon>
            <ChevronDownIcon />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content style={contentStyles} position="popper" sideOffset={4}>
            <SelectPrimitive.ScrollUpButton style={scrollButtonStyles}>
              <ChevronDownIcon />
            </SelectPrimitive.ScrollUpButton>
            <SelectPrimitive.Viewport style={{ padding: tokens.spacing.xs }}>
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  style={itemStyles}
                >
                  <SelectPrimitive.ItemIndicator style={{ marginRight: tokens.spacing.sm }}>
                    <CheckIcon />
                  </SelectPrimitive.ItemIndicator>
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollDownButton style={scrollButtonStyles}>
              <ChevronDownIcon />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      {error ? (
        <span style={errorTextStyles}>{error}</span>
      ) : helperText ? (
        <span style={helperStyles}>{helperText}</span>
      ) : null}
    </div>
  );
}
