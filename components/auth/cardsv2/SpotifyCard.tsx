// components/auth/cardsv2/SpotifyCard.tsx
'use client';

import { useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpotify } from '@fortawesome/free-brands-svg-icons';

type DockSide = 'left' | 'right';
type Props = { dock: DockSide; setDock: (side: DockSide) => void };

export default function SpotifyCard({ dock, setDock }: Props) {
  const carouselRef = useRef<HTMLDivElement>(null);

  const goTo = useCallback((id: string) => {
    const el = carouselRef.current?.querySelector<HTMLElement>(`#${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, []);

  return (
    <div className={`${dock === 'right' ? 'flex' : 'hidden sm:flex'} items-center min-h-0`}>
      <div className="flex flex-col min-h-0 h-full shadow-lg p-[var(--pad)] bg-gradient-to-r from-[#1DB954] to-[#1ED760] text-white">
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div ref={carouselRef} className="carousel carousel-center w-full overflow-hidden scroll-smooth">
            <div id="ftue1" className="gap-[var(--gap-y)] carousel-item w-full flex flex-col items-center justify-center text-center">
              <h2 className="text-[var(--heading-sz)] font-bold mb-[var(--gap-y)]">Connect to Spotify</h2>
              <p className="mb-[var(--gap-y)]">Connect to Spotify to discover tailored events</p>
              <button type="button" onClick={() => goTo('ftue2')} className="btn btn-soft w-1/2 h-[var(--ctrl-h)] text-[var(--font-sz)]">
                Next
              </button>
            </div>

            <div id="ftue2" className="gap-[var(--gap-y)] carousel-item w-full flex flex-col items-center justify-center text-center">
              <h2 className="text-[var(--heading-sz)] font-bold mb-[var(--gap-y)]">Personalized picks</h2>
              <p className="mb-[var(--gap-y)]">Get concert recommendations from your artists</p>
              <button type="button" onClick={() => goTo('ftue3')} className="btn btn-soft w-1/2 h-[var(--ctrl-h)] text-[var(--font-sz)]">
                Next
              </button>
            </div>

            <div id="ftue3" className="gap-[var(--gap-y)] carousel-item w-full flex flex-col items-center justify-center text-center">
              <h2 className="text-[var(--heading-sz)] font-bold mb-[var(--gap-y)]">You’re ready!</h2>
              <p className="mb-[var(--gap-y)]">Start exploring events now.</p>
              <button type="button" onClick={() => goTo('ftue1')} className="btn btn-soft w-1/2 h-[var(--ctrl-h)] text-[var(--font-sz)]">
                Next
              </button>
            </div>
          </div>
        </div>

        <div className="shrink-0 h-[var(--oauth-row-h)] flex items-center justify-center mt-auto">
          <button className="btn btn-soft btn-wide h-[var(--ctrl-h)] text-[var(--font-sz)]">
            <FontAwesomeIcon icon={faSpotify} />
            <span className="ml-2 whitespace-nowrap">Connect to Spotify</span>
          </button>
        </div>
      </div>
    </div>
  );
}
