'use client';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faKey, faEye, faEyeSlash, faAt, faSpinner } from '@fortawesome/free-solid-svg-icons';
import type { AuthCardProps } from '@/components/auth/cards/types';
import { signIn } from 'next-auth/react';

export default function CreateAccountCard({ showPwd, setShowPwd, setMode }: AuthCardProps) {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pending, setPending]   = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setPending(true);

    try {
      // create user
      const resp = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      if (!resp.ok) {
        let msg = 'Registration failed. Please try again.';
        try {
          const data = await resp.json();
          if (data?.error) msg = data.error;
        } catch {}
        setErrorMsg(msg);
        return;
      }

      // proactively send the first code
      try {
        await fetch('/api/auth/verify/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
      } catch {}

      const lower = email.trim().toLowerCase();

      // sign-in (non-redirecting)
      const login = await signIn('credentials', {
        redirect: false,
        identifier: lower,
        password,
      });

      // If NextAuth blocks with VerifyEmail OR signals /verify, stash and go verify
      const needsVerify =
        login?.error === 'VerifyEmail' ||
        (login?.url && new URL(login.url, window.location.origin).pathname.startsWith('/verify'));

      if (needsVerify) {
        sessionStorage.setItem(
          'postVerifyLogin',
          JSON.stringify({ email: lower, password })
        );
        window.location.href = `/verify?email=${encodeURIComponent(lower)}`;
        return;
      }

      if (login?.error) {
        setErrorMsg(login.error || 'Could not sign in.');
        return;
      }

      window.location.href = '/my-profile';
    } catch (err) {
      console.error('Register/sign-in failed:', err);
      setErrorMsg('Network error. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <h2 className="card-title self-center whitespace-nowrap text-[var(--heading-sz)]">
        Create an account
      </h2>

      <form onSubmit={onSubmit} className="flex-1 min-h-0 flex flex-col">
        <div className="input-group flex flex-col h-full w-full items-center mt-0 sm:mt-[calc(var(--gap-y)*2)] gap-[var(--gap-y)]">
          <label className="input validator h-[var(--ctrl-h)] text-[var(--font-sz)]">
            <FontAwesomeIcon icon={faUser} />
            <input
              type="text"
              className=""
              required
              placeholder="Name"
              pattern="^([^\p{N}\p{S}\p{C}\p{P}]{2,20})$"
              minLength={3}
              maxLength={30}
              title="Only letters"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="username"
            />
          </label>
          <div className="validator-hint text-[calc(var(--font-sz)*0.9)] leading-tight">
            Must be 3 to 30 characters containing only letters
          </div>

          <label className="input validator h-[var(--ctrl-h)] text-[var(--font-sz)]">
            <FontAwesomeIcon icon={faAt} />
            <input
              className=""
              type="email"
              required
              placeholder="mail@site.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <div className="validator-hint text-[calc(var(--font-sz)*0.9)] leading-tight">
            Enter valid email address
          </div>

          <label className="input validator h-[var(--ctrl-h)] text-[var(--font-sz)] items-center gap-2">
            <FontAwesomeIcon icon={faKey} />
            <input
              type={showPwd ? 'text' : 'password'}
              className="grow min-w-0"
              required
              placeholder="Password"
              pattern="^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[^A-Za-z0-9]).{8,}$"
              title="Must contain at least one number, one lowercase letter, one uppercase letter, one special character, and be between 8 and 64 characters long"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <div className="tooltip tooltip-left" data-tip={showPwd ? 'Hide password' : 'Show password'}>
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                aria-pressed={showPwd}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
                className="btn btn-ghost rounded-2xl !min-h-0 h-[calc(var(--ctrl-h)-0.4rem)] w-[calc(var(--ctrl-h)-0.4rem)] p-0"
              >
                <FontAwesomeIcon icon={faEyeSlash} style={{ display: showPwd ? 'inline' : 'none' }} />
                <FontAwesomeIcon icon={faEye} style={{ display: showPwd ? 'none' : 'inline' }} />
              </button>
            </div>
          </label>

          <div className="validator-hint text-[calc(var(--font-sz)*0.9)] leading-tight [@media(max-height:690px)]:hidden!">
            Must be more than 8 characters, including<br />
            At least one number<br />
            At least one uppercase letter<br />
            At least one special character
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="flex items-center justify-center alert alert-error my-2
                         text-[calc(var(--font-sz)*0.9)] md:text-[calc(var(--font-sz))] h-[calc(var(--ctrl-h)-0.5rem)]
                         w-[max(3rem,min(20rem,100%))]"
            >
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col shrink-0 h-[var(--oauth-row-h)*1.5] gap-0 sm:gap-3 justify-center items-center w-full min-w-0 mb-0 sm:mb-2">
          <button
            className="link link-primary text-center mt-0 sm:mt-2 text-[calc(var(--font-sz)*0.9)] md:text-[calc(var(--font-sz)*1.1)]"
            onClick={(e) => { e.preventDefault(); setMode('signin'); }}
          >
            Or Login using an existing account
          </button>
          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="btn btn-neutral-content btn-outline btn-wide h-[var(--ctrl-h)]
                       text-[calc(var(--font-sz)*0.9)] md:text-[calc(var(--font-sz)*1.1)]
                       inline-flex items-center justify-center gap-2"
          >
            {pending ? (<><span>Signing up</span><FontAwesomeIcon icon={faSpinner} spin /></>) : 'Sign Up'}
          </button>
        </div>
      </form>
    </>
  );
}
