// app/auth/error/page.tsx
'use client';

import Link from 'next/link';

export default function AuthErrorPage({ searchParams }: { searchParams: { error?: string } }) {
  const code = searchParams?.error;

  if (code === 'OAuthAccountNotLinked') {
    return (
      <main className="p-6 space-y-3">
        <h1 className="text-xl font-semibold">Account already exists</h1>
        <p>
          It looks like you signed up with a different provider. Please sign in with that provider
          first, then connect Spotify from your account settings.
        </p>
        <Link className="btn btn-primary" href="/loginv2">Go to sign in</Link>
      </main>
    );
  }

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">Sign-in Error</h1>
      <p className="text-sm">Error code: {code ?? 'Unknown'}</p>
      <Link className="btn btn-primary mt-4" href="/loginv2">Back to sign in</Link>
    </main>
  );
}
