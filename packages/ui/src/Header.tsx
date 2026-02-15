import React from 'react';

export interface HeaderProps {
  children?: React.ReactNode;
}

const headerStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 24px',
  backgroundColor: 'var(--color-bg, #ffffff)',
  borderBottom: '1px solid var(--color-border, #e5e5e5)',
  position: 'sticky',
  top: 0,
  zIndex: 100,
};

const logoStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  fontSize: '20px',
  fontWeight: 700,
  color: 'var(--color-text, #1a1a1a)',
  textDecoration: 'none',
};

const logoIconStyles: React.CSSProperties = {
  width: '32px',
  height: '32px',
  backgroundColor: '#5865F2',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#ffffff',
  fontWeight: 800,
  fontSize: '16px',
};

const navStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const navLinkBase: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: 500,
  transition: 'all 0.15s ease',
  color: 'var(--color-text-secondary, #6b7280)',
};

const navLinkActive: React.CSSProperties = {
  ...navLinkBase,
  backgroundColor: 'var(--color-bg-secondary, #f3f4f6)',
  color: 'var(--color-text, #1a1a1a)',
};

export function Header({ children }: HeaderProps) {
  return (
    <header style={headerStyles}>
      <a href="/" style={logoStyles}>
        <div style={logoIconStyles}>F</div>
        FightRise
      </a>
      {children}
    </header>
  );
}

export interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  isActive?: boolean;
}

export function NavLink({ href, children, isActive }: NavLinkProps) {
  return (
    <a href={href} style={isActive ? navLinkActive : navLinkBase}>
      {children}
    </a>
  );
}

export interface HeaderActionsProps {
  children: React.ReactNode;
}

export function HeaderActions({ children }: HeaderActionsProps) {
  return (
    <div style={navStyles}>
      {children}
    </div>
  );
}
