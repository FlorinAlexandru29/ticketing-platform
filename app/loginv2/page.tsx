'use client';
import { useState } from 'react';
import Navbar from "@/components/Navbar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faKey, faEye, faEyeSlash,faAt } from '@fortawesome/free-solid-svg-icons';
import Head from 'next/head';

export default function LoginPageV2() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [dock, setDock] = useState<'left' | 'right'>('right');
  const [showPwd, setShowPwd] = useState(false);

  return (
    <>
      <Head>
        <script src="https://kit.fontawesome.com/fbadad80a0.js" crossOrigin="anonymous"></script>
      </Head>

      {/* Safe viewport height; no vertical scroll */}
      <main className="bg-sky-50 h-svh flex flex-col overflow-x-hidden">
        <Navbar />

        {/* Left half | right half */}
        <section
          className="relative flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-[1fr_1fr]
                     grid-rows-[1fr_auto] sm:grid-rows-none"
          /* Shared sizing vars (tweak here) */
          style={{
            ['--oauth-row-h' as any]: 'clamp(3rem, 10dvh, 6rem)',
            ['--ctrl-h' as any]: 'clamp(0.50rem, 6dvh, 2.75rem)',
            ['--font-sz' as any]: 'clamp(0.875rem, 1.9dvh, 1rem)',
            ['--heading-sz' as any]: 'clamp(1rem, 2.6dvh, 1.25rem)',
            ['--pad' as any]: 'clamp(1rem, 3dvh, 1.5rem)',
            ['--gap-y' as any]: 'clamp(0.25rem, 1.2dvh, 0.5rem)',
          }}
        >

          {/* Login/Sign-up card */}
          <div className={`${dock === 'left' ? 'flex' : 'hidden sm:flex'} min-h-0 items-stretch`}>
            <div className="card rounded-none bg-base-100 card-lg shadow-sm w-full min-h-0 h-full p-[var(--pad)]">
              <div className="card-body flex flex-col min-h-0 h-full p-0">
                <h2 className="card-title self-center whitespace-nowrap text-[var(--heading-sz)]">
                  Create an account
                </h2>

                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="input-group flex flex-col w-full items-center mt-[calc(var(--gap-y)*2)] gap-[var(--gap-y)]">

                    <label className="input validator h-[var(--ctrl-h)] text-[var(--font-sz)]">
                    <FontAwesomeIcon icon={faUser} />
                    <input
                      type="text"
                      className=""
                      required
                      placeholder="Username"
                      pattern="[A-Za-z][A-Za-z0-9\\-]*"
                      minLength={3}
                      maxLength={30}
                      title="Only letters"
                    />
                    </label>
                    <p className="validator-hint text-[calc(var(--font-sz)*0.9)] leading-tight">
                      Must be 3 to 30 characters containing only letters
                    </p>
                    
                    <label className="input validator h-[var(--ctrl-h)] text-[var(--font-sz)]">
                      <FontAwesomeIcon icon={faAt} />
                    <input
                      className="input validator h-[var(--ctrl-h)] text-[var(--font-sz)]"
                      type="email"
                      required
                      placeholder="mail@site.com"
                    />
                    </label>
                    <p className="validator-hint text-[calc(var(--font-sz)*0.9)] leading-tight">
                      Enter valid email address
                    </p>

<label className="input validator h-[var(--ctrl-h)] text-[var(--font-sz)] items-center gap-2">
  <FontAwesomeIcon icon={faKey} />

  <input
    type={showPwd ? 'text' : 'password'}
    className="grow min-w-0"
    required
    placeholder="Password"
    minLength={8}
    pattern="(?=.*\\d)(?=.*[a-z])(?=.*[A-Z]).{8,}"
    title="Must be more than 8 characters, including number, lowercase letter, uppercase letter"
    autoComplete="new-password"
  />

  {/* Eye toggle with tooltip (Supabase style) */}
  <div
    className="tooltip tooltip-left"
    data-tip={showPwd ? 'Hide password' : 'Show password'}
  >
    <button
      type="button"
      onClick={() => setShowPwd(v => !v)}
      aria-pressed={showPwd}
      aria-label={showPwd ? 'Hide password' : 'Show password'}
      className="btn btn-ghost rounded-2xl !min-h-0 h-[calc(var(--ctrl-h)-0.4rem)] w-[calc(var(--ctrl-h)-0.4rem)] p-0"
    >
      <FontAwesomeIcon icon={showPwd ? faEyeSlash : faEye} />
    </button>
  </div>
</label>

<p className="validator-hint text-[calc(var(--font-sz)*0.9)] leading-tight [@media(max-height:590px)]:hidden">
  Must be more than 8 characters, including<br />
  At least one number<br />
  At least one lowercase letter<br />
  At least one uppercase letter
</p>

                  </div>

                  <div className="flex justify-center items-center h-full w-full">
                    <button className="btn btn-neutral-content btn-outline btn-wide h-[var(--ctrl-h)] text-[var(--font-sz)]">
                      Sign up
                    </button>
                  </div>
                </div>
              </div>

              {/* Separator */}
              <div className="divider my-[var(--gap-y)]">Or Sign In with</div>

              {/* Fixed-height row for OAuth buttons (aligns with Spotify row) */}
              <div className="flex flex-wrap shrink-0 h-[var(--oauth-row-h)] gap-3 justify-center items-center w-full min-w-0">
                <button
                  className="btn btn-soft sm:w-auto md:w-[clamp(10rem,45%,16rem)] max-w-full
                             h-[var(--ctrl-h)] text-[var(--font-sz)]"
                >
                  <FontAwesomeIcon icon={['fab', 'google']} />
                  <span className="ml-2">Google</span>
                </button>
                <button
                  className="btn btn-soft sm:w-auto md:w-[clamp(10rem,45%,16rem)] max-w-full
                             h-[var(--ctrl-h)] text-[var(--font-sz)]"
                >
                  <FontAwesomeIcon icon={['fab', 'facebook']} />
                  <span className="ml-2">Facebook</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Spotify Card */}
          <div className={`${dock === 'right' ? 'flex' : 'hidden sm:flex'} items-center min-h-0`}>
            <div className="flex flex-col min-h-0 h-full shadow-lg p-[var(--pad)] bg-gradient-to-r from-[#1DB954] to-[#1ED760] text-white">

              {/* Spotify FTUE Carousel */}
              <div className="flex-1 min-h-0 flex items-center justify-center">
                <div className="carousel carousel-center w-full overflow-hidden scroll-smooth">
                  <div id="ftue1" className="gap-[var(--gap-y)] carousel-item w-full flex flex-col items-center justify-center text-center">
                    <h2 className="text-[var(--heading-sz)] font-bold mb-[var(--gap-y)]">Connect to Spotify</h2>
                    <p className="mb-[var(--gap-y)]">Connect to Spotify to discover tailored events</p>
                    <a href="#ftue2" className="btn btn-soft w-1/2 h-[var(--ctrl-h)] text-[var(--font-sz)]">Next</a>
                  </div>
                  <div id="ftue2" className="gap-[var(--gap-y)] carousel-item w-full flex flex-col items-center justify-center text-center">
                    <h2 className="text-[var(--heading-sz)] font-bold mb-[var(--gap-y)]">Personalized picks</h2>
                    <p className="mb-[var(--gap-y)]">Get concert recommendations from your artists</p>
                    <a href="#ftue3" className="btn btn-soft w-1/2 h-[var(--ctrl-h)] text-[var(--font-sz)]">Next</a>
                  </div>
                  <div id="ftue3" className="gap-[var(--gap-y)] carousel-item w-full flex flex-col items-center justify-center text-center">
                    <h2 className="text-[var(--heading-sz)] font-bold mb-[var(--gap-y)]">You’re ready!</h2>
                    <p className="mb-[var(--gap-y)]">Start exploring events now.</p>
                    <a href="#ftue1" className="btn btn-soft w-1/2 h-[var(--ctrl-h)] text-[var(--font-sz)]">Next</a>
                  </div>
                </div>
              </div>

              {/* Matching fixed-height row for Spotify button (aligned with left OAuth row) */}
              <div className="shrink-0 h-[var(--oauth-row-h)] flex items-center justify-center mt-auto">
                <button className="btn btn-soft btn-wide h-[var(--ctrl-h)] text-[var(--font-sz)]">
                  {/* onClick={() => signIn('spotify')} */}
                  <FontAwesomeIcon icon={['fab', 'spotify']} />
                  <span className="ml-2 whitespace-nowrap">Connect to Spotify</span>
                </button>
              </div>
            </div>
          </div>

          {/* Dock for mobile view */}
          <div className="relative dock dock-md sm:hidden">
            <button className={`${dock === 'left' ? 'dock-active' : ''}`} onClick={() => setDock('left')}>
              <FontAwesomeIcon icon={faUser} />
              <span className="dock-label">Login</span>
            </button>

            <button className={`${dock === 'right' ? 'dock-active' : ''}`} onClick={() => setDock('right')}>
              <FontAwesomeIcon icon={['fab', 'spotify']} />
              <span className="dock-label">Spotify Login</span>
            </button>
          </div>

        </section>
      </main>
    </>
  );
}
