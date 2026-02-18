'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SuccessContent() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message');

  const successMessages: Record<string, string> = {
    startgg_linked: 'Your Start.gg account has been successfully linked!',
    bot_installed: 'FightRise bot has been successfully added to your server!',
  };

  const successMessage = message ? successMessages[message] || 'Operation successful!' : 'Operation successful!';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full bg-gray-800 rounded-lg p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-green-500 mb-4">Success!</h1>
        <p className="text-gray-300 mb-6">{successMessage}</p>
        <Link
          href="/"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors"
        >
          Go to Home
        </Link>
      </div>
    </div>
  );
}

export default function AuthSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-900">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
