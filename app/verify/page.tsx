'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

function VerifyContent() {
  const sp = useSearchParams();
  const router = useRouter();

  const email   = sp.get('email') || '';
  const success = sp.get('success');  // from magic link
  const errRaw  = sp.get('error');
  const err     = errRaw ? decodeURIComponent(errRaw) : null;

  const [code, setCode]         = useState('');
  const [msg, setMsg]           = useState<string | null>(err);
  const [msgKind, setMsgKind]   = useState<'info' | 'error' | null>(err ? 'error' : null);
  const [pending, setPending]   = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!email) router.replace('/login');
  }, [email, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function tryAutoSignIn(): Promise<boolean> {
    try {
      // Prefer the unified key
      let stash: { email?: string; password?: string } | null = null;

      const unified = sessionStorage.getItem('postVerifyLogin');
      if (unified) stash = JSON.parse(unified);

      // Back-compat: older keys if they exist
      if (!stash) {
        const e = sessionStorage.getItem('signup:email');
        const p = sessionStorage.getItem('signup:pw');
        if (e && p) stash = { email: e, password: p };
      }

      if (!stash?.email || !stash?.password) return false;
      if (stash.email.toLowerCase() !== email.toLowerCase()) return false;

      await signIn('credentials', {
        redirect: true,
        identifier: stash.email,
        password: stash.password,
        callbackUrl: '/', // land here after
      });

      sessionStorage.removeItem('postVerifyLogin');
      sessionStorage.removeItem('signup:email');
      sessionStorage.removeItem('signup:pw');
      return true;
    } catch {
      return false;
    }
  }

  useEffect(() => {
    if (!success) return;
    (async () => {
      const ok = await tryAutoSignIn();
      if (ok) return; // next-auth navigates
      setMsg('Email verified! Redirecting…');
      setMsgKind('info');
      const t = setTimeout(() => router.replace('/'), 1200);
      return () => clearTimeout(t);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [success]);

  useEffect(() => {
    if (!err) return;
    sessionStorage.removeItem('postVerifyLogin');
    sessionStorage.removeItem('signup:email');
    sessionStorage.removeItem('signup:pw');

    const normalized =
      err === 'LinkExpired'     ? 'Verification link expired. Redirecting…'
    : err === 'AlreadyVerified' ? 'Email already verified. Redirecting…'
    : `${err}. Redirecting…`;
    setMsg(normalized);
    setMsgKind('error');
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
        setMsgKind('error');
      } else {
        const ok = await tryAutoSignIn();
        if (ok) return; // next-auth redirects
        setMsg('Verified! Redirecting…');
        setMsgKind('info');
        router.replace('/');
      }
    } catch {
      setMsg('Network error. Try again.');
      setMsgKind('error');
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
        setMsgKind('error');
      } else {
        setMsg('Code resent. Check your email.');
        setMsgKind('info');
        setCooldown(30);
      }
    } catch {
      setMsg('Network error. Try again.');
      setMsgKind('error');
    }
  }

  const alertClass =
    msgKind === 'error' ? 'alert alert-error' :
    msgKind === 'info'  ? 'alert alert-info'  : 'alert';

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
            Prefer a link? Check the email—there’s a one-click verify link too. <br/>
            Please make sure to check the Spam folder
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
