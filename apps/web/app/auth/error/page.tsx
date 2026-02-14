'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

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
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full bg-gray-800 rounded-lg p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Authorization Failed</h1>
        <p className="text-gray-300 mb-6">{errorMessage}</p>
        <Link
          href="/auth/signin"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors"
        >
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-900">Loading...</div>}>
      <ErrorContent />
    </Suspense>
  );
}
