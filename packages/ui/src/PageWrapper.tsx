import React from 'react';
import { tokens } from './tokens.js';

export interface PageWrapperProps {
  /** Page title */
  title: string;
  /** Page description */
  description?: string;
  /** Optional actions to display in the header (buttons, links, etc.) */
  actions?: React.ReactNode;
  /** Breadcrumb navigation */
  breadcrumbs?: React.ReactNode;
  /** Page content */
  children: React.ReactNode;
  /** Additional container styles */
  style?: React.CSSProperties;
}

const containerStyles: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: tokens.colors.gray[50],
};

const contentStyles: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: `${tokens.spacing.lg} ${tokens.spacing.md}`,
};

const headerStyles: React.CSSProperties = {
  marginBottom: tokens.spacing.lg,
};

const breadcrumbsStyles: React.CSSProperties = {
  marginBottom: tokens.spacing.sm,
  fontSize: tokens.typography.fontSize.sm,
};

const titleRowStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: tokens.spacing.md,
  flexWrap: 'wrap',
};

const titleStyles: React.CSSProperties = {
  margin: 0,
  fontSize: tokens.typography.fontSize['2xl'],
  fontWeight: tokens.typography.fontWeight.bold,
  color: tokens.colors.gray[900],
  lineHeight: tokens.typography.lineHeight.tight,
};

const descriptionStyles: React.CSSProperties = {
  margin: `${tokens.spacing.sm} 0 0`,
  fontSize: tokens.typography.fontSize.base,
  color: tokens.colors.gray[500],
  lineHeight: tokens.typography.lineHeight.normal,
};

const actionsStyles: React.CSSProperties = {
  display: 'flex',
  gap: tokens.spacing.sm,
  alignItems: 'center',
  flexWrap: 'wrap',
};

/**
 * PageWrapper provides a consistent layout for pages with title, description, and actions.
 * Use it as the outer wrapper for page content.
 */
export function PageWrapper({
  title,
  description,
  actions,
  breadcrumbs,
  children,
  style,
}: PageWrapperProps) {
  return (
    <div style={{ ...containerStyles, ...style }}>
      <div style={contentStyles}>
        <div style={headerStyles}>
          {breadcrumbs && <div style={breadcrumbsStyles}>{breadcrumbs}</div>}
          <div style={titleRowStyles}>
            <div>
              <h1 style={titleStyles}>{title}</h1>
              {description && <p style={descriptionStyles}>{description}</p>}
            </div>
            {actions && <div style={actionsStyles}>{actions}</div>}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export interface PageSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Section title */
  title?: string;
  /** Section description */
  description?: string;
  /** Whether to show a divider above the section */
  showDivider?: boolean;
}

const sectionStyles: React.CSSProperties = {
  marginBottom: tokens.spacing.xl,
};

const sectionTitleStyles: React.CSSProperties = {
  margin: `0 0 ${tokens.spacing.sm}`,
  fontSize: tokens.typography.fontSize.lg,
  fontWeight: tokens.typography.fontWeight.semibold,
  color: tokens.colors.gray[900],
};

const sectionDescriptionStyles: React.CSSProperties = {
  margin: `0 0 ${tokens.spacing.md}`,
  fontSize: tokens.typography.fontSize.sm,
  color: tokens.colors.gray[500],
};

const dividerStyles: React.CSSProperties = {
  height: '1px',
  backgroundColor: tokens.colors.border,
  marginBottom: tokens.spacing.lg,
};

/**
 * PageSection groups related content within a page.
 */
export function PageSection({
  children,
  title,
  description,
  showDivider = false,
  style,
  ...props
}: PageSectionProps) {
  return (
    <div style={{ ...sectionStyles, ...style }} {...props}>
      {showDivider && <div style={dividerStyles} />}
      {title && <h2 style={sectionTitleStyles}>{title}</h2>}
      {description && <p style={sectionDescriptionStyles}>{description}</p>}
      {children}
    </div>
  );
}

export interface PageGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Number of columns on desktop (default 3) */
  columns?: 1 | 2 | 3 | 4;
  /** Gap between grid items */
  gap?: 'sm' | 'md' | 'lg';
}

const gapSizes = {
  sm: tokens.spacing.sm,
  md: tokens.spacing.md,
  lg: tokens.spacing.lg,
};

/**
 * PageGrid provides a responsive grid layout for page content.
 * Defaults to 1 column, expands to configured columns on larger screens.
 */
export function PageGrid({
  children,
  columns = 3,
  gap = 'md',
  style,
  ...props
}: PageGridProps) {
  return (
    <>
      <style>
        {`
          .page-grid {
            display: grid;
            grid-template-columns: repeat(var(--columns, 1), 1fr);
            gap: ${gapSizes[gap]};
          }
          @media (min-width: 768px) {
            .page-grid {
              grid-template-columns: repeat(min(var(--columns, 3), 3), 1fr);
            }
          }
        `}
      </style>
      <div
        className="page-grid"
        style={{
          '--columns': columns,
          ...style,
        } as React.CSSProperties}
        {...props}
      >
        {children}
      </div>
    </>
  );
}
