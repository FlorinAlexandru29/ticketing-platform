// components/auth/SpotifyLoginCard.tsx
'use client';
import { useSession, signIn, signOut } from 'next-auth/react';

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function SpotifyLoginCard() {
  return (
    <div className="flex flex-col items-center justify-center w-[1/4] rounded-3xl shadow-lg p-4 bg-gradient-to-r from-[#1DB954] to-[#1ED760]" >
      <p className="text-center mb-4 text-neutral text-shadow-sm">
        Login using your Spotify account to receive personalized notifications for events and festivals
      </p>
      <button className="btn btn-soft btn-wide" onClick={() => signIn('spotify')}>
        <FontAwesomeIcon icon={['fab', 'spotify']} />
        Connect to Spotify
      </button>
    </div>
  );
}
