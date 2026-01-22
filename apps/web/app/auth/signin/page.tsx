'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SignInButton } from '@/components/auth';

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const error = searchParams.get('error');

  return (
    <div
      style={{
        maxWidth: '400px',
        width: '100%',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
      }}
    >
      <h1
        style={{
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '8px',
          color: '#333',
        }}
      >
        Sign in to FightRise
      </h1>
      <p
        style={{
          color: '#666',
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
            backgroundColor: '#fee2e2',
            color: '#dc2626',
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
    </div>
  );
}

function SignInLoading() {
  return (
    <div
      style={{
        maxWidth: '400px',
        width: '100%',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
      }}
    >
      <p style={{ color: '#666' }}>Loading...</p>
    </div>
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
        backgroundColor: '#f5f5f5',
      }}
    >
      <Suspense fallback={<SignInLoading />}>
        <SignInContent />
      </Suspense>
    </div>
  );
}
