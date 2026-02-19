'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, Button } from '@fightrise/ui';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const errorMessages: Record<string, string> = {
    startgg_oauth_error: 'Start.gg authorization was denied.',
    missing_params: 'Missing required parameters.',
    invalid_state: 'Invalid state parameter. Please try again.',
    oauth_not_configured: 'Start.gg OAuth is not configured.',
    token_exchange_failed: 'Failed to exchange authorization code.',
    user_fetch_failed: 'Failed to fetch your Start.gg information.',
    no_user_data: 'No user data received from Start.gg.',
    user_not_found: 'Your Discord account is not registered.',
    unknown: 'An unknown error occurred.',
  };

  const errorMessage = error ? errorMessages[error] || errorMessages.unknown : errorMessages.unknown;

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <Card style={{ maxWidth: '400px', width: '100%', padding: '32px' }}>
        <CardContent>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#f87171', marginBottom: '16px' }}>Authorization Failed</h1>
          <p style={{ color: '#d4d4d8', marginBottom: '24px' }}>{errorMessage}</p>
          <Link href="/auth/signin" passHref>
            <Button variant="primary" style={{ display: 'inline-block' }}>
              Back to Sign In
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-zinc-950">Loading...</div>}>
      <ErrorContent />
    </Suspense>
  );
}
