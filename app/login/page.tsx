'use client';
import { useState } from 'react';
import Navbar from "@/components/Navbar";
import Dock from '@/components/auth/cards/Dock';
import SpotifyCard from '@/components/auth/cards/SpotifyCard';
import { LoginSocialCard } from '@/components/auth/cards/LoginSocialCard';
import CreateAccountCard from '@/components/auth/cards/LoginCard';
import LoginCard from '@/components/auth/cards/CreateAccountCard';


export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [dock, setDock] = useState<'left' | 'right'>('right');
  const [showPwd, setShowPwd] = useState(false);

  return (
    <>
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
                {mode === 'signup' ? (
                  <LoginCard showPwd={showPwd} setShowPwd={setShowPwd} setMode={setMode} />
                ) : (
                  <CreateAccountCard showPwd={showPwd} setShowPwd={setShowPwd} setMode={setMode} />
                )}
              </div>

              {/* Separator */}
              <LoginSocialCard />

            </div>
          </div>

          {/* Right Spotify Card */}
          <SpotifyCard dock={dock} setDock={setDock} />


          {/* Dock for mobile view */}

          <Dock dock={dock} setDock={setDock} />

        </section>
      </main>
    </>
  );
}
