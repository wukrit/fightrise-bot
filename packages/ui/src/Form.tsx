import React from 'react';
import { tokens } from './tokens.js';

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
  /** Called when form is submitted and validation passes */
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  /** Disable browser validation */
  noValidate?: boolean;
}

const formStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.spacing.md,
};

export function Form({
  children,
  onSubmit,
  noValidate = false,
  style,
  ...props
}: FormProps) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    if (onSubmit) {
      await onSubmit(e);
    }
  };

  return (
    <form
      style={{ ...formStyles, ...style }}
      onSubmit={handleSubmit}
      noValidate={noValidate}
      {...props}
    >
      {children}
    </form>
  );
}

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Field label */
  label?: string;
  /** ID for the field, used to associate label with input */
  id?: string;
  /** Error message to display */
  error?: string;
  /** Helper text shown below the input */
  helperText?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Child input element */
  children: React.ReactNode;
}

const fieldContainerStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.spacing.xs,
};

const labelStyles: React.CSSProperties = {
  fontSize: tokens.typography.fontSize.sm,
  fontWeight: tokens.typography.fontWeight.medium,
  color: tokens.colors.gray[900],
};

const requiredStyles: React.CSSProperties = {
  color: tokens.colors.danger,
  marginLeft: tokens.spacing.xs,
};

const helperTextStyles: React.CSSProperties = {
  fontSize: tokens.typography.fontSize.xs,
  color: tokens.colors.gray[500],
};

const errorTextStyles: React.CSSProperties = {
  fontSize: tokens.typography.fontSize.xs,
  color: tokens.colors.danger,
};

export function FormField({
  label,
  id,
  error,
  helperText,
  required,
  children,
  style,
  ...props
}: FormFieldProps) {
  const generatedId = React.useId();
  const fieldId = id || generatedId;

  return (
    <div style={{ ...fieldContainerStyles, ...style }} {...props}>
      {label && (
        <label style={labelStyles} htmlFor={fieldId}>
          {label}
          {required && <span style={requiredStyles}>*</span>}
        </label>
      )}
      {children}
      {error ? (
        <span style={errorTextStyles}>{error}</span>
      ) : helperText ? (
        <span style={helperTextStyles}>{helperText}</span>
      ) : null}
    </div>
  );
}

export interface FormGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Label for the group */
  label?: string;
  /** Horizontal layout for inline fields */
  horizontal?: boolean;
}

const groupContainerStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.spacing.sm,
};

const groupHorizontalStyles: React.CSSProperties = {
  display: 'flex',
  gap: tokens.spacing.md,
  alignItems: 'flex-end',
};

const groupLabelStyles: React.CSSProperties = {
  fontSize: tokens.typography.fontSize.sm,
  fontWeight: tokens.typography.fontWeight.semibold,
  color: tokens.colors.gray[900],
  marginBottom: tokens.spacing.xs,
};

export function FormGroup({
  children,
  label,
  horizontal = false,
  style,
  ...props
}: FormGroupProps) {
  return (
    <div
      style={{
        ...(horizontal ? groupHorizontalStyles : groupContainerStyles),
        ...style,
      }}
      {...props}
    >
      {label && <span style={groupLabelStyles}>{label}</span>}
      {children}
    </div>
  );
}

export interface FormActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Align actions to the right (default) or left */
  align?: 'left' | 'right' | 'center';
}

const actionsBaseStyles: React.CSSProperties = {
  display: 'flex',
  gap: tokens.spacing.sm,
  marginTop: tokens.spacing.sm,
};

export function FormActions({
  children,
  align = 'right',
  style,
  ...props
}: FormActionsProps) {
  const alignmentStyles: React.CSSProperties = {
    ...actionsBaseStyles,
    justifyContent: align === 'right' ? 'flex-end' : align === 'left' ? 'flex-start' : 'center',
  };

  return (
    <div style={{ ...alignmentStyles, ...style }} {...props}>
      {children}
    </div>
  );
}
