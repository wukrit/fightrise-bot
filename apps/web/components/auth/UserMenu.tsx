'use client';

import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { SignInButton } from './SignInButton';
import { SignOutButton } from './SignOutButton';

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div style={{ padding: '8px 16px', color: '#666' }}>
        Loading...
      </div>
    );
  }

  if (!session) {
    return <SignInButton />;
  }

  const avatarUrl = session.user.discordAvatar
    ? `https://cdn.discordapp.com/avatars/${session.user.discordId}/${session.user.discordAvatar}.png`
    : `https://cdn.discordapp.com/embed/avatars/${parseInt(session.user.discordId) % 5}.png`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Image
          src={avatarUrl}
          alt={session.user.discordUsername}
          width={32}
          height={32}
          style={{ borderRadius: '50%' }}
        />
        <span style={{ fontWeight: 500 }}>
          {session.user.discordUsername}
        </span>
      </div>
      <SignOutButton />
    </div>
  );
}
