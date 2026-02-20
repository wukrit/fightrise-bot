'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@fightrise/ui';
import { SignInButton } from '@/components/auth';

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const error = searchParams.get('error');

  return (
    <Card style={{ maxWidth: '400px', width: '100%', padding: '40px', textAlign: 'center' }}>
      <CardContent>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '8px',
            color: '#f4f4f5',
          }}
        >
          Sign in to FightRise
        </h1>
        <p
          style={{
            color: '#a1a1aa',
            marginBottom: '24px',
          }}
        >
          Connect with Discord to manage tournaments
        </p>

        {error && (
          <div
            style={{
              padding: '12px',
              marginBottom: '16px',
              backgroundColor: 'rgba(127, 29, 29, 0.3)',
              color: '#f87171',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          >
            {error === 'OAuthSignin' && 'Error starting sign in flow'}
            {error === 'OAuthCallback' && 'Error during sign in callback'}
            {error === 'OAuthCreateAccount' && 'Error creating account'}
            {error === 'Callback' && 'Error during callback'}
            {error === 'Default' && 'An error occurred during sign in'}
            {!['OAuthSignin', 'OAuthCallback', 'OAuthCreateAccount', 'Callback', 'Default'].includes(error) && 'An error occurred'}
          </div>
        )}

        <SignInButton callbackUrl={callbackUrl} />
      </CardContent>
    </Card>
  );
}

function SignInLoading() {
  return (
    <Card style={{ maxWidth: '400px', width: '100%', padding: '40px', textAlign: 'center' }}>
      <CardContent>
        <p style={{ color: '#a1a1aa' }}>Loading...</p>
      </CardContent>
    </Card>
  );
}

export default function SignInPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        backgroundColor: '#09090b',
      }}
    >
      <Suspense fallback={<SignInLoading />}>
        <SignInContent />
      </Suspense>
    </div>
  );
}
