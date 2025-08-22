'use client';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faKey, faEye, faEyeSlash, faAt, faSpinner } from '@fortawesome/free-solid-svg-icons';
import type { AuthCardProps } from '@/components/auth/cards/types';
import { signIn } from 'next-auth/react';

export default function LoginCard({ showPwd, setShowPwd, setMode }: AuthCardProps) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pending, setPending]   = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setPending(true);

    try {
      // Always clear & use ONE stash key
      sessionStorage.removeItem('postVerifyLogin');

      const res = await signIn('credentials', {
        redirect: false,
        identifier: email.trim().toLowerCase(),
        password,
      });

      // If NextAuth requires verify, stash creds then go to /verify
      if (res?.url && res.url.includes('/verify')) {
        sessionStorage.setItem('postVerifyLogin', JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }));
        window.location.href = res.url;
        return;
      }

      if (res?.error) {
        setErrorMsg('Invalid email or password.');
      } else {
        window.location.href = '/my-profile';
      }
    } catch {
      setErrorMsg('Unable to sign in. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <h2 className="card-title self-center whitespace-nowrap text-[var(--heading-sz)]">
        Login to your account
      </h2>

      <form onSubmit={onSubmit} className="flex-1 min-h-0 flex flex-col">
        <div className="input-group flex flex-col w-full h-full justify-start items-center mt-0 sm:mt-[calc(var(--gap-y)*2)] gap-[var(--gap-y)]">
          {/* Email */}
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

          {/* Password + show/hide + under-aligned link (non-focusing) */}
          <label className="input validator h-[var(--ctrl-h)] text-[var(--font-sz)] items-center gap-2">
            <span className="relative bottom-[-34px] left-[-12px] flex-1 min-w-0 text-[calc(var(--font-sz)*0.9)] md:text-[calc(var(--font-sz)*1.1)]">
              <button
                type="button"
                className="link link-error text-center mt-0 sm:mt-2 text-[calc(var(--font-sz)*0.9)] md:text-[calc(var(--font-sz)*1.1)]"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onPointerDown={(e) => e.preventDefault()}
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.preventDefault()}
              >
                Forgot your password?
              </button>
            </span>

            <FontAwesomeIcon icon={faKey} />

            <input
              type={showPwd ? 'text' : 'password'}
              className="grow min-w-0"
              required
              placeholder="Password"
              minLength={8}
              pattern="^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[^A-Za-z0-9]).{8,}$"
              title="Must contain at least one number, one lowercase letter, one uppercase letter, one special character, and be between 8 and 64 characters long"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <div className="tooltip tooltip-left" data-tip={showPwd ? 'Hide password' : 'Show password'}>
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                aria-pressed={showPwd}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
                className="btn btn-ghost rounded-2xl !min-h-0 h-[calc(var(--ctrl-h)-0.4rem)] w-[calc(var(--ctrl-h)-0.4rem)] p-0"
              >
                <FontAwesomeIcon icon={showPwd ? faEyeSlash : faEye} />
              </button>
            </div>
          </label>
        </div>

        {/* Bottom controls */}
        <div className="flex flex-col shrink-0 h-[var(--oauth-row-h)*1.5] gap-0 sm:gap-3 justify-center items-center w-full min-w-0 mb-0 sm:mb-2">
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

          <button
            type="button"
            className="link link-primary text-center mt-0 sm:mt-2 text-[calc(var(--font-sz)*0.9)] md:text-[calc(var(--font-sz)*1.1)]"
            onClick={(e) => { e.preventDefault(); setMode('signup'); }}
          >
            Or Create a new account
          </button>

          <button
            type="submit"
            disabled={pending}
            className="btn btn-neutral-content btn-outline btn-wide h-[var(--ctrl-h)] text-[calc(var(--font-sz)*0.9)] md:text-[calc(var(--font-sz)*1.1)]"
          >
            {pending ? (<><span className="mr-2">Logging in</span><FontAwesomeIcon icon={faSpinner} spin /></>) : 'Login'}
          </button>
        </div>
      </form>
    </>
  );
}
