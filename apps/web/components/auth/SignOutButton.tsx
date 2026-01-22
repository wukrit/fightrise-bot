'use client';

import { signOut } from 'next-auth/react';

interface SignOutButtonProps {
  callbackUrl?: string;
  className?: string;
}

export function SignOutButton({ callbackUrl = '/', className }: SignOutButtonProps) {
  return (
    <button
      onClick={() => signOut({ callbackUrl })}
      className={className}
      style={{
        padding: '8px 16px',
        backgroundColor: 'transparent',
        color: '#666',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '14px',
        cursor: 'pointer',
      }}
    >
      Sign out
    </button>
  );
}
