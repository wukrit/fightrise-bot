'use client';

import { signIn } from 'next-auth/react';
import { Button, DiscordIcon } from '@fightrise/ui';

interface SignInButtonProps {
  callbackUrl?: string;
}

export function SignInButton({ callbackUrl = '/' }: SignInButtonProps) {
  return (
    <Button variant="discord" onClick={() => signIn('discord', { callbackUrl })}>
      <DiscordIcon size={24} />
      Sign in with Discord
    </Button>
  );
}
