// app/verify/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

export default function VerifyPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const email = (sp.get('email') || '').toLowerCase();
  const success = sp.get('success');
  const err = sp.get('error'); // e.g., "expired"

  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // If no email in query, bounce to login
  useEffect(() => {
    if (!email) router.replace('/login');
  }, [email, router]);

  // Focus code input on mount (only if we're not in an "expired" state)
  useEffect(() => {
    if (!err) inputRef.current?.focus();
  }, [err]);

  // Cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Handle success banner
  useEffect(() => {
    if (success) {
        setMsg('Email verified! You can now log in.')
        const t = setTimeout(() => {
        router.replace('/');
      }, 2500);
      return () => clearTimeout(t);
    };

  }, [success]);

  // Handle expired/used link: show error, then redirect to Home
  useEffect(() => {
    if (err === 'expired') {
      setMsg('Verification link expired.');
      const t = setTimeout(() => {
        router.replace('/');
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [err, router]);

  async function submit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!email || code.length !== 6 || pending) return;

    setMsg(null);
    setPending(true);
    try {
      const res = await fetch('/api/auth/verify/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        setMsg(data?.error || 'Invalid code. Please try again.');
        return;
      }

      // Try auto-login if this user just registered (password stored temporarily)
      const savedEmail = sessionStorage.getItem('signup:email') || '';
      const savedPw = sessionStorage.getItem('signup:pw') || '';

      if (savedEmail && savedPw && savedEmail === email) {
        const login = await signIn('credentials', {
          redirect: false,
          identifier: email,
          password: savedPw,
        });

        sessionStorage.removeItem('signup:email');
        sessionStorage.removeItem('signup:pw');

        if (login?.error) {
          router.replace('/login?verified=1');
        } else {
          window.location.href = '/my-profile';
        }
      } else {
        router.replace('/login?verified=1');
      }
    } catch {
      setMsg('Network error. Try again.');
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    if (!email || pending) return;
    setMsg(null);
    setPending(true);
    try {
      const res = await fetch('/api/auth/verify/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data?.error || 'Could not resend code.');
      } else {
        setMsg('Code resent. Check your email.');
        setCooldown(30);
      }
    } catch {
      setMsg('Network error. Try again.');
    } finally {
      setPending(false);
      inputRef.current?.focus();
    }
  }

  function handleCodeChange(v: string) {
    const six = v.replace(/\D/g, '').slice(0, 6);
    setCode(six);
    if (six.length === 6) {
      setTimeout(() => submit(), 10);
    }
  }

  const isExpired = err === 'expired';

  return (
    <main className="min-h-svh flex items-center justify-center p-4 bg-base-200">
      <div className="card bg-base-100 shadow-md w-full max-w-md">
        <div className="card-body">
          <h2 className="card-title">Verify your email</h2>
          {!isExpired && (
            <p className="text-sm opacity-80">
              We sent a 6-digit code to <strong>{email}</strong>.
            </p>
          )}

          {msg && (
            <div
              role="alert"
              className={`mt-2 alert ${isExpired ? 'alert-error' : 'alert-info'}`}
            >
              <span>{msg}</span>
              {isExpired || success && (
                <button
                  className="btn btn-sm btn-ghost ml-auto"
                  onClick={() => router.replace('/')}
                >
                  Go now
                </button>
              )}
            </div>
          )}

          {!isExpired || success && (
            <>
              <form onSubmit={submit} className="mt-4 space-y-3">
                <input
                  ref={inputRef}
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  className="input input-bordered w-full text-center tracking-widest text-lg"
                  value={code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  required
                  autoComplete="one-time-code"
                />
                <button
                  className="btn btn-primary w-full"
                  disabled={pending || code.length !== 6}
                  type="submit"
                >
                  {pending ? 'Verifying…' : 'Verify'}
                </button>
              </form>

              <div className="mt-3 flex items-center justify-between">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() =>
                    (window.location.href = `/login?email=${encodeURIComponent(email)}`)
                  }
                  disabled={pending}
                >
                  Use a different email
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={resend}
                  disabled={pending || cooldown > 0}
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                </button>
              </div>

              <p className="mt-3 text-xs opacity-60">
                Prefer a link? Check the email—there’s a one-click verify link too.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
