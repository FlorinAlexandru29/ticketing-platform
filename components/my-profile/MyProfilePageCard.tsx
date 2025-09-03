'use client';

import { useState } from 'react';
import Dock from '@/components/my-profile/Dock';
import type { ReactNode } from 'react';

type DockSide = 'left' | 'right';

export default function MyProfilePageCard({
  left,
  right,
}: {
  left: ReactNode;
  right: ReactNode;
}) {
  const [dock, setDock] = useState<DockSide>('right');

  return (
    <section
      className="relative flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-[1fr_1fr]
                 grid-rows-[1fr_auto] sm:grid-rows-none max-h-dvh"
      /* Shared sizing vars */
      style={{
        ['--oauth-row-h' as any]: 'clamp(3rem, 10dvh, 6rem)',
        ['--ctrl-h' as any]: 'clamp(0.50rem, 6dvh, 2.75rem)',
        ['--font-sz' as any]: 'clamp(0.875rem, 1.9dvh, 1rem)',
        ['--heading-sz' as any]: 'clamp(1rem, 2.6dvh, 1.25rem)',
        ['--pad' as any]: 'clamp(1rem, 3dvh, 1.5rem)',
        ['--gap-y' as any]: 'clamp(0.25rem, 1.2dvh, 0.5rem)',
      }}
    >
      {/* Left column (profile card) */}
      <div className={`${dock === 'left' ? 'flex' : 'hidden sm:flex'} min-h-0 items-stretch`}>
        <div className="card rounded-none bg-base-100 card-lg shadow-none border-none w-full min-h-0 h-full p-2 sm:p-[var(--pad)]">
          <div className="card-body flex flex-col min-h-0 h-full p-0">
            {left}
          </div>
        </div>
      </div>

      {/* Right column (tickets) */}
      <div className={`${dock === 'right' ? 'flex' : 'hidden sm:flex'}  min-h-0 items-stretch bg-gradient-to-r from-[#1DB954] to-[#1ED760]`}>
        <div className="card rounded-none card-lg shadow-none outline-hidden w-full min-h-0 h-full pb-[var(--pad)]">
          <div className="card-body flex flex-col min-h-0 h-full border-none p-0">
            {right}
         </div>
        </div>
      </div>
      {/* Dock toggle (mobile) */}
      <Dock dock={dock} setDock={setDock} />
    </section>
  );
}
