// app/verify/page.tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function VerifyContent() {
  const sp = useSearchParams();
  const router = useRouter();

  const email   = sp.get('email')   || '';
  const success = sp.get('success');        // e.g. ?success=1 from confirm link
  const errRaw  = sp.get('error');          // e.g. ?error=LinkExpired or AlreadyVerified
  const err     = errRaw ? decodeURIComponent(errRaw) : null;

  const [code, setCode]           = useState('');
  const [msg, setMsg]             = useState<string | null>(err);
  const [msgKind, setMsgKind]     = useState<'info' | 'error' | null>(err ? 'error' : null);
  const [pending, setPending]     = useState(false);
  const [cooldown, setCooldown]   = useState(0);

  // If no email param, bounce to /login
  useEffect(() => {
    if (!email) router.replace('/login');
  }, [email, router]);

  // Cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Success via magic link -> show blue banner then go home
  useEffect(() => {
    if (!success) return;
    setMsg('Email verified! Redirecting…');
    setMsgKind('info'); // BLUE
    const t = setTimeout(() => router.replace('/'), 1200);
    return () => clearTimeout(t);
  }, [success, router]);

  // Error via magic link -> show red banner then go home
  useEffect(() => {
    if (!err) return;
    const normalized =
      err === 'LinkExpired'      ? 'Verification link expired. Redirecting…'
    : err === 'AlreadyVerified'  ? 'Email already verified. Redirecting…'
    : err === 'expired'         ? 'Verification link expired. Redirecting…'
    : `${err}. Redirecting…`;
    setMsg(normalized);
    setMsgKind('error'); // RED
    const t = setTimeout(() => router.replace('/'), 2000);
    return () => clearTimeout(t);
  }, [err, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setMsgKind(null);
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
        setMsgKind('error'); // RED
      } else {
        // Server performs auto-sign-in on success; go home.
        setMsg('Verified! Redirecting…');
        setMsgKind('info'); // BLUE
        router.replace('/');
      }
    } catch {
      setMsg('Network error. Try again.');
      setMsgKind('error'); // RED
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    setMsg(null);
    setMsgKind(null);
    try {
      const res = await fetch('/api/auth/verify/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data?.error || 'Could not resend code.');
        setMsgKind('error'); // RED
      } else {
        setMsg('Code resent. Check your email.');
        setMsgKind('info'); // BLUE
        setCooldown(30);
      }
    } catch {
      setMsg('Network error. Try again.');
      setMsgKind('error'); // RED
    }
  }

  const alertClass =
    msgKind === 'error' ? 'alert alert-error' :
    msgKind === 'info'  ? 'alert alert-info'  :
    'alert'; // fallback (shouldn’t happen)

  return (
    <main className="min-h-svh flex items-center justify-center p-4 bg-base-200">
      <div className="card bg-base-100 shadow-md w-full max-w-md">
        <div className="card-body">
          <h2 className="card-title">Verify your email</h2>
          <p className="text-sm opacity-80">
            We sent a 6-digit code to <strong>{email}</strong>.
          </p>

          {msg && (
            <div role="alert" className={`${alertClass} mt-2`}>
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
