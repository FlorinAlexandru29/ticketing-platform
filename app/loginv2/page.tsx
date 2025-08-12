'use client';
import { useState } from 'react';
import Navbar from "@/components/Navbar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function LoginPageV2() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  return (
    <main className="bg-sky-50 min-h-screen flex flex-col overflow-hidden">
      <Navbar />

      {/*  Left half | center divider | right half  */}
      <section className="relative flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-4">

        {/* LEFT (fills the left half; flush to left edge) */}
        <div className="flex items-stretch">
          <div className="card rounded-none bg-base-100 card-lg shadow-sm w-full h-full">
            <div className="card-body h-full">
              <h2 className="card-title self-center whitespace-nowrap">
                Create an account
              </h2>

              <div className="flex flex-col gap-4 justify-between h-full items-center">
                <div className="input-group flex flex-col gap-0 md:gap-2 w-full items-center mt-0 md:mt-10">
                  <input
                    type="text"
                    className="input validator"
                    required
                    placeholder="Username"
                    pattern="[A-Za-z][A-Za-z0-9\-]*"
                    minLength={3}
                    maxLength={30}
                    title="Only letters"
                  />
                  <p className="validator-hint">
                    Must be 3 to 30 characters containing only letters
                  </p>

                  <input className="input validator" type="email" required placeholder="mail@site.com" />
                  <div className="validator-hint">Enter valid email address</div>

                  <input
                    type="password"
                    className="input validator"
                    required
                    placeholder="Password"
                    minLength={8}
                    pattern="(?=.*\\d)(?=.*[a-z])(?=.*[A-Z]).{8,}"
                    title="Must be more than 8 characters, including number, lowercase letter, uppercase letter"
                  />
                  <p className="validator-hint">
                    Must be more than 8 characters, including<br />
                    At least one number<br />
                    At least one lowercase letter<br />
                    At least one uppercase letter
                  </p>
                </div>

                <button className="btn btn-neutral-content btn-outline btn-wide">Sign up</button>
              </div>
            </div>
          </div>
        </div>

        {/* CENTER divider: vertical on md+, horizontal on mobile */}
         
        <div className="md:hidden divider divider-neutral text-neutral">OR</div>

        {/* RIGHT (right half). Card is 1/2 of the right half => 1/4 of screen */}
         <div className="flex justify-center items-center">
  <div className="flex flex-col h-8/10 w-7/10 rounded-3xl shadow-lg p-6 bg-gradient-to-r from-[#1DB954] to-[#1ED760] text-white">
    {/* Middle: text, centered vertically */}
    <div className="flex-1 flex items-center justify-center">
      <div className="carousel w-full ml-6 space-x-6 items-center">
          <div id="ftue1" className="carousel-item flex flex-col items-center justify-center w-full">
            <h2 className="text-xl font-bold mb-2">Connect to spotify</h2>
            <p className="mb-4">Connect to spotify to discover tailored events</p>
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
            <a href="#ftue1" className="btn btn-primary">Next</a>
          </div>
        </div>
    </div>

    {/* Bottom: button */}
    <button className="btn btn-soft btn-wide self-center mt-6">
      {/* onClick={() => signIn('spotify')} */}
      <FontAwesomeIcon icon={['fab', 'spotify']} />
      <span className="ml-2">Connect to Spotify</span>
    </button>
  </div>
</div>
      </section>
    </main>
  );
}
