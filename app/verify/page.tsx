// app/verify/page.tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function VerifyContent() {
  const sp = useSearchParams();
  const router = useRouter();

  const email   = sp.get('email')   || '';
  const success = sp.get('success');
  const err     = sp.get('error');

  const [code, setCode]       = useState('');
  const [msg, setMsg]         = useState<string | null>(err ? decodeURIComponent(err) : null);
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!email) router.replace('/login');
  }, [email, router]);

  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [cooldown]);

  useEffect(() => {
    if (success) setMsg('Email verified! You can now log in.');
  }, [success]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setPending(true);
    try {
      const res = await fetch('/api/auth/verify/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data?.error || 'Invalid code');
      } else {
        // redirect to login (or your auto-login flow will handle from here)
        router.replace('/login?verified=1');
      }
    } catch {
      setMsg('Network error. Try again.');
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    setMsg(null);
    try {
      const res = await fetch('/api/auth/verify/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data?.error || 'Could not resend code.');
      } else {
        setMsg('Code resent. Check your email.');
        setCooldown(30);
      }
    } catch {
      setMsg('Network error. Try again.');
    }
  }

  return (
    <main className="min-h-svh flex items-center justify-center p-4 bg-base-200">
      <div className="card bg-base-100 shadow-md w-full max-w-md">
        <div className="card-body">
          <h2 className="card-title">Verify your email</h2>
          <p className="text-sm opacity-80">
            We sent a 6-digit code to <strong>{email}</strong>.
          </p>

          {msg && (
            <div role="alert" className="alert alert-info mt-2">
              <span>{msg}</span>
            </div>
          )}

          <form onSubmit={submit} className="mt-4 space-y-3">
            <input
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="Enter 6-digit code"
              className="input input-bordered w-full text-center tracking-widest text-lg"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
            />
            <button className="btn btn-primary w-full" disabled={pending || code.length !== 6}>
              {pending ? 'Verifying…' : 'Verify'}
            </button>
          </form>

          <div className="mt-3 flex items-center justify-between">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => (window.location.href = `/login?email=${encodeURIComponent(email)}`)}
            >
              Use a different email
            </button>
            <button className="btn btn-outline btn-sm" onClick={resend} disabled={cooldown > 0}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
          </div>

          <p className="mt-3 text-xs opacity-60">
            Prefer a link? Check the email—there’s a one-click verify link too.
          </p>
        </div>
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-svh flex items-center justify-center p-6 bg-base-200">
          <div className="loading loading-spinner" />
        </main>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
