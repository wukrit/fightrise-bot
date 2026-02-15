import React from 'react';

// Types
export interface BottomNavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface BottomNavProps {
  items: BottomNavItem[];
  currentPath: string;
}

const containerStyles: React.CSSProperties = {
  display: 'none',
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: '#18181b',
  borderTop: '1px solid #27272a',
  padding: '8px 16px',
  paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
  zIndex: 1000,
};

const navStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-around',
  alignItems: 'center',
  maxWidth: '600px',
  margin: '0 auto',
};

const linkBase: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px 12px',
  borderRadius: '8px',
  textDecoration: 'none',
  color: '#71717a',
  fontSize: '10px',
  fontWeight: 500,
  gap: '4px',
  minWidth: '64px',
  minHeight: '48px',
  transition: 'all 0.15s ease',
};

const linkActive: React.CSSProperties = {
  ...linkBase,
  color: '#a1a1aa',
};

const iconBase: React.CSSProperties = {
  width: '24px',
  height: '24px',
};

const badgeStyles: React.CSSProperties = {
  position: 'absolute',
  top: '2px',
  right: '50%',
  transform: 'translateX(12px)',
  backgroundColor: '#ef4444',
  color: '#ffffff',
  fontSize: '10px',
  fontWeight: 700,
  padding: '2px 5px',
  borderRadius: '10px',
  minWidth: '16px',
  textAlign: 'center',
};

function HomeIcon() {
  return (
    <svg style={iconBase} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function TournamentIcon() {
  return (
    <svg style={iconBase} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg style={iconBase} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg style={iconBase} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg style={iconBase} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

export const defaultNavItems: BottomNavItem[] = [
  { href: '/dashboard', label: 'Home', icon: <HomeIcon /> },
  { href: '/tournaments', label: 'Tournaments', icon: <TournamentIcon /> },
  { href: '/tournaments/new', label: 'New', icon: <PlusIcon /> },
  { href: '/notifications', label: 'Alerts', icon: <BellIcon />, badge: 0 },
  { href: '/account', label: 'Account', icon: <UserIcon /> },
];

export function BottomNav({ items = defaultNavItems, currentPath }: BottomNavProps) {
  const isActive = (href: string) => {
    if (href === '/dashboard' && currentPath === '/') return true;
    return currentPath.startsWith(href) && href !== '/';
  };

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .bottom-nav {
            display: flex !important;
          }
        }
      `}</style>
      <nav style={containerStyles} className="bottom-nav">
        <div style={navStyles}>
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              style={isActive(item.href) ? linkActive : linkBase}
            >
              <span style={{ position: 'relative' }}>
                {item.icon}
                {item.badge && item.badge > 0 && (
                  <span style={badgeStyles}>{item.badge}</span>
                )}
              </span>
              {item.label}
            </a>
          ))}
        </div>
      </nav>
    </>
  );
}

export default BottomNav;
