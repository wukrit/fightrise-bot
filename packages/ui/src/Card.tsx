import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated';
}

const variantStyles: Record<string, React.CSSProperties> = {
  default: {
    backgroundColor: 'var(--color-bg, #ffffff)',
    border: '1px solid var(--color-border, #e5e5e5)',
    borderRadius: '8px',
  },
  outlined: {
    backgroundColor: 'var(--color-bg, #ffffff)',
    border: '2px solid var(--color-border, #e5e5e5)',
    borderRadius: '8px',
  },
  elevated: {
    backgroundColor: 'var(--color-bg, #ffffff)',
    border: 'none',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  },
};

const baseStyles: React.CSSProperties = {
  padding: '20px',
};

export function Card({
  children,
  variant = 'default',
  style,
  ...props
}: CardProps) {
  const combinedStyles: React.CSSProperties = {
    ...baseStyles,
    ...variantStyles[variant],
    ...style,
  };

  return (
    <div style={combinedStyles} {...props}>
      {children}
    </div>
  );
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const headerStyles: React.CSSProperties = {
  marginBottom: '16px',
  paddingBottom: '12px',
  borderBottom: '1px solid var(--color-border, #e5e5e5)',
};

export function CardHeader({ children, style, ...props }: CardHeaderProps) {
  return (
    <div style={{ ...headerStyles, ...style }} {...props}>
      {children}
    </div>
  );
}

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

const titleStyles: React.CSSProperties = {
  margin: 0,
  fontSize: '18px',
  fontWeight: 600,
  color: 'var(--color-text, #1a1a1a)',
};

export function CardTitle({ children, style, ...props }: CardTitleProps) {
  return (
    <h3 style={{ ...titleStyles, ...style }} {...props}>
      {children}
    </h3>
  );
}

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

const descriptionStyles: React.CSSProperties = {
  margin: '4px 0 0',
  fontSize: '14px',
  color: '#6b7280',
};

export function CardDescription({ children, style, ...props }: CardDescriptionProps) {
  return (
    <p style={{ ...descriptionStyles, ...style }} {...props}>
      {children}
    </p>
  );
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardContent({ children, style, ...props }: CardContentProps) {
  return (
    <div style={style} {...props}>
      {children}
    </div>
  );
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const footerStyles: React.CSSProperties = {
  marginTop: '16px',
  paddingTop: '12px',
  borderTop: '1px solid var(--color-border, #e5e5e5)',
  display: 'flex',
  gap: '12px',
  alignItems: 'center',
};

export function CardFooter({ children, style, ...props }: CardFooterProps) {
  return (
    <div style={{ ...footerStyles, ...style }} {...props}>
      {children}
    </div>
  );
}
