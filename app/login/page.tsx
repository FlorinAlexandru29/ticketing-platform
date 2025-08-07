'use client';

import { useState } from "react";
import Navbar from "@/components/Navbar";
import SwapCards from "@/components/auth/SwapCards";
import SpotifyLoginCard from "@/components/auth/SpotifyLoginCard";
import FTUEOverlay from "@/components/auth/FTUEOverlay";

export default function LoginPage() {
  const [showFTUE, setShowFTUE] = useState(true);

  return (
    <main className="bg-base-100 min-h-screen max-h-screen flex flex-col overflow-hidden relative">
      <Navbar />

      <section className="relative rounded-b-3xl flex basis-1 flex-1">
        <div className="flex flex-col items-center justify-start h-full w-full">
          <SpotifyLoginCard />
        </div>
      </section>

      <SwapCards />

      {showFTUE && <FTUEOverlay onClose={() => setShowFTUE(false)} />}
    </main>
  );
}
