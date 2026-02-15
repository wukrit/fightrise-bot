import React from 'react';

export interface SidebarProps {
  children: React.ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
}

const overlayStyles: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  zIndex: 99,
  display: 'none',
};

const sidebarBase: React.CSSProperties = {
  width: '260px',
  backgroundColor: 'var(--color-bg, #ffffff)',
  borderRight: '1px solid var(--color-border, #e5e5e5)',
  height: '100vh',
  position: 'fixed',
  left: 0,
  top: 0,
  overflowY: 'auto',
  zIndex: 100,
  transition: 'transform 0.2s ease',
};

const headerStyles: React.CSSProperties = {
  padding: '20px',
  borderBottom: '1px solid var(--color-border, #e5e5e5)',
};

const logoStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  fontSize: '18px',
  fontWeight: 700,
  color: 'var(--color-text, #1a1a1a)',
  textDecoration: 'none',
};

const logoIconStyles: React.CSSProperties = {
  width: '28px',
  height: '28px',
  backgroundColor: '#5865F2',
  borderRadius: '6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#ffffff',
  fontWeight: 800,
  fontSize: '14px',
};

const navStyles: React.CSSProperties = {
  padding: '12px',
};

const sectionStyles: React.CSSProperties = {
  marginBottom: '20px',
};

const sectionTitleStyles: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#6b7280',
};

const linkStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '10px 12px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: 500,
  color: 'var(--color-text-secondary, #6b7280)',
  transition: 'all 0.15s ease',
};

const linkActiveStyles: React.CSSProperties = {
  ...linkStyles,
  backgroundColor: 'var(--color-bg-secondary, #f3f4f6)',
  color: 'var(--color-text, #1a1a1a)',
};

export function Sidebar({ children, isOpen = true }: SidebarProps) {
  const sidebarStyle: React.CSSProperties = {
    ...sidebarBase,
    transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
  };

  return (
    <>
      <div style={{ ...overlayStyles, display: isOpen ? 'block' : 'none' }} />
      <aside style={sidebarStyle}>
        <div style={headerStyles}>
          <a href="/" style={logoStyles}>
            <div style={logoIconStyles}>F</div>
            FightRise
          </a>
        </div>
        <nav style={navStyles}>
          {children}
        </nav>
      </aside>
    </>
  );
}

export interface SidebarSectionProps {
  title?: string;
  children: React.ReactNode;
}

export function SidebarSection({ title, children }: SidebarSectionProps) {
  return (
    <div style={sectionStyles}>
      {title && <div style={sectionTitleStyles}>{title}</div>}
      {children}
    </div>
  );
}

export interface SidebarLinkProps {
  href: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  isActive?: boolean;
}

export function SidebarLink({ href, icon, children, isActive }: SidebarLinkProps) {
  return (
    <a href={href} style={isActive ? linkActiveStyles : linkStyles}>
      {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </a>
  );
}

export interface SidebarToggleProps {
  onClick: () => void;
  isOpen: boolean;
}

export function SidebarToggle({ onClick, isOpen }: SidebarToggleProps) {
  const toggleStyles: React.CSSProperties = {
    position: 'fixed',
    top: '12px',
    left: isOpen ? '276px' : '12px',
    zIndex: 101,
    padding: '8px',
    backgroundColor: 'var(--color-bg, #ffffff)',
    border: '1px solid var(--color-border, #e5e5e5)',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'left 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <button style={toggleStyles} onClick={onClick}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        {isOpen ? (
          <path d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
        ) : (
          <path d="M4 12h16M4 6h16M4 18h16" />
        )}
      </svg>
    </button>
  );
}
