'use client';

import { usePathname } from 'next/navigation';
import { BottomNav } from '@fightrise/ui';
import './globals.css';

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Pages where bottom nav should be hidden (auth pages and landing)
  const hideNav = pathname?.startsWith('/auth') || pathname === '/';

  return (
    <>
      <main>{children}</main>
      {!hideNav && (
        <BottomNav
          items={[
            { href: '/dashboard', label: 'Home', icon: <span>🏠</span> },
            { href: '/tournaments', label: 'Tournaments', icon: <span>🏆</span> },
            { href: '/tournaments/new', label: 'New', icon: <span>➕</span> },
            { href: '/account', label: 'Account', icon: <span>👤</span> },
          ]}
          currentPath={pathname || ''}
        />
      )}
    </>
  );
}
