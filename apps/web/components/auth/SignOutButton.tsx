'use client';

import { signOut } from 'next-auth/react';
import { Button } from '@fightrise/ui';

interface SignOutButtonProps {
  callbackUrl?: string;
}

export function SignOutButton({ callbackUrl = '/' }: SignOutButtonProps) {
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => signOut({ callbackUrl })}
      style={{
        backgroundColor: 'transparent',
        color: '#666',
        border: '1px solid #ddd',
      }}
    >
      Sign out
    </Button>
  );
}
