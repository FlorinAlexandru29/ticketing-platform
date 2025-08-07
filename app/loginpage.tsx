"use client";
import Image from "next/image";
import { useState } from "react";
import { SwapCards } from "./swapcards";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { library } from '@fortawesome/fontawesome-svg-core'

/* import all the icons in Free Solid, Free Regular, and Brands styles */
import { fas } from '@fortawesome/free-solid-svg-icons'
import { far } from '@fortawesome/free-regular-svg-icons'
import { fab } from '@fortawesome/free-brands-svg-icons'

library.add(fas, far, fab)



export default function Home() {
  const [showFTUE, setShowFTUE] = useState(true);

  return (
    <>
      {/* Navbar stays above everything */}
      {/* Page layout */}
      <main className="bg-base-100 min-h-screen max-h-screen flex flex-col overflow-hidden relative">
         <nav className="relative z-50 navbar bg-base-100 text-neutral-content px-4">
          <div className="flex-1">
            <a className="btn btn-neutral text-xl">daisyUI</a>
          </div>
          <div className="flex space-x-4">
            <a className="hover:underline" href="#">Events</a>
            <a className="hover:underline" href="#">Artists</a>
            <a className="hover:underline" href="#">Tickets</a>
          </div>
          <div className="flex-none">
            <button className="btn btn-square btn-neutral-content">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block h-5 w-5 stroke-current">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </nav>
        {/* Spotify Section */}
         <section className="z-0 relative rounded-b-3xl flex basis-1 flex-1">
         
  <div className="flex flex-col items-center justify-start h-full w-full">
              <div className="flex flex-col items-center justify-center w-[1/4] rounded-3xl shadow-lg p-4 bg-gradient-to-r from-[#1DB954] to-[#1ED760]" >
              {/*style={{background: "linear-gradient(120deg,rgba(30, 215, 96, 1) 0%, rgba(0, 0, 0, 1) 20%, rgba(0, 0, 0, 1) 80%, rgba(30, 215, 96, 1) 100%)"}} */}
                <p className="text-center mb-4 text-neutral text-shadow-sm">Login using your spotify account to receive personalized notifications for events and festivals</p>
                <button className="btn btn-soft btn-wide">
                  
                  <FontAwesomeIcon icon={['fab', 'spotify']} />

                  Connect to Spotify</button>
              </div>
            </div>
         
        </section>

        {/* Bottom white section */}
       
    {/* Card State Toggle */}
    <SwapCards />
  

        {/* FTUE Overlay */}
        {showFTUE && (
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <div className="relative w-full max-w-xl mx-auto p-6">
              {/* Skip Button */}
              <button
                onClick={() => setShowFTUE(false)}
                className="absolute top-2 right-2 btn btn-sm btn-error"
              >
                Skip
              </button>

              {/* Carousel Content */}
              <div className="carousel w-full bg-white rounded-2xl shadow-lg p-6 space-x-4">
                <div id="ftue1" className="carousel-item flex flex-col items-center justify-center w-full">
                  <h2 className="text-xl font-bold mb-2">Welcome to e-Ticketing!</h2>
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
                  <button onClick={() => setShowFTUE(false)} className="btn btn-success">Finish</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
