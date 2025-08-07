// components/auth/FTUEOverlay.tsx
'use client';
import { useState } from "react";

export default function FTUEOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center">
      <div className="relative w-full max-w-xl mx-auto p-6">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 btn btn-sm btn-error"
        >
          Skip
        </button>

        <div className="carousel w-full bg-white rounded-2xl shadow-lg p-6 space-x-4">
          <div id="ftue1" className="carousel-item flex flex-col items-center justify-center w-full">
            <h2 className="text-xl font-bold mb-2">Welcome to StageList!</h2>
            <p className="mb-4">Discover the best live music around you.</p>
            <a href="#ftue2" className="btn btn-primary">Next</a>
          </div>

          <div id="ftue2" className="carousel-item flex flex-col items-center justify-center w-full">
            <h2 className="text-xl font-bold mb-2">Connect to Spotify</h2>
            <p className="mb-4">Get personal concert recommendations.</p>
            <a href="#ftue3" className="btn btn-primary">Next</a>
          </div>

          <div id="ftue3" className="carousel-item flex flex-col items-center justify-center w-full">
            <h2 className="text-xl font-bold mb-2">You're Ready!</h2>
            <p className="mb-4">Start exploring events now.</p>
            <button onClick={onClose} className="btn btn-success">Finish</button>
          </div>
        </div>
      </div>
    </div>
  );
}
