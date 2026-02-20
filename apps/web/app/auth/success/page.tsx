'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, Button } from '@fightrise/ui';

function SuccessContent() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message');

  const successMessages: Record<string, string> = {
    startgg_linked: 'Your Start.gg account has been successfully linked!',
    bot_installed: 'FightRise bot has been successfully added to your server!',
  };

  const successMessage = message ? successMessages[message] || 'Operation successful!' : 'Operation successful!';

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <Card style={{ maxWidth: '400px', width: '100%', padding: '32px' }}>
        <CardContent>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#4ade80', marginBottom: '16px' }}>Success!</h1>
          <p style={{ color: '#d4d4d8', marginBottom: '24px' }}>{successMessage}</p>
          <Link href="/" passHref>
            <Button variant="primary" style={{ display: 'inline-block' }}>
              Go to Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-zinc-950">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
