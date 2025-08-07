import React, { useState } from "react";

export function SwapCards() {
  const [primaryCard, setPrimaryCard] = useState<"left" | "right">("left");

  return (
    <>
      {/* Left Card */}
      <section className={`z-10 relative bg-startwhite rounded-t-3xl basis-1 flex-1 p-4 flex flex-wrap items-center gap-4 overflow-y-auto justify-center transition-all duration-300 ease-in-out`}>
        <div className="flex h-full w-3/4 flex-col lg:flex-row gap-4 transition-all duration-300 ease-in-out justify-center">

      <div
        className={`card bg-base-100 card-lg shadow-sm transition-all duration-500 ${
          primaryCard === "left" ? "w-6/8" : "w-2/8 cursor-pointer" 
        }`}
        // Add onClick handler here
        onClick={() => setPrimaryCard("left")}
      >
        <div className="card-body">
          <h2 className="card-title self-center whitespace-nowrap">Create an account</h2>

          {/* --- Conditional Rendering Block --- */}
          {primaryCard === "left" ? (
            // If left card is primary, show the form
            <div className="flex flex-col gap-4 justify-center items-center">
              <label className="input validator">
                <svg className="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2.5" fill="none" stroke="currentColor">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </g>
                </svg>
                <input type="text" required placeholder="Name" pattern="[A-Za-z]*" minLength={3} maxLength={30} title="Only letters" />
              </label>

              <label className="input validator">
                <svg className="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2.5" fill="none" stroke="currentColor">
                    <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                  </g>
                </svg>
                <input type="email" placeholder="mail@site.com" required />
              </label>
              

              <label className="input validator">
                <svg className="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2.5" fill="none" stroke="currentColor">
                    <path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"></path>
                    <circle cx="16.5" cy="7.5" r=".5" fill="currentColor"></circle>
                  </g>
                </svg>
                <input type="password" required placeholder="Password" minLength={8} pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}" title="Must be more than 8 characters, including number, lowercase letter, uppercase letter" />
              </label>
              <button className="btn btn-neutral-content btn-outline btn-wide">Sign up</button>
            </div>
          ) : (
            // If right card is primary, show this text instead
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="font-semibold">Don't have an account? <br/> Sign up using your email address</p>
              <p className="text-sm opacity-70 mt-1">Click the arrow or click here to expand this form!</p>
            </div>
          )}
        </div>
      </div>

      {/* Swap Divider Button */}
      <div className="flex items-center justify-center">
        <button
          onClick={() => setPrimaryCard(primaryCard === "left" ? "right" : "left")}
          className="btn btn-circle btn-outline bg-base-100"
          title="Swap Login Methods"
        >
          {/* New SVG icon with conditional rotation */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 640 640"
            // Apply transition classes and rotate based on the primaryCard state
            className={`h-6 w-6 transition-transform duration-500 ease-in-out ${
              primaryCard === "left" ? "rotate-180" : "rotate-0"
            }`}
            fill="currentColor"
          >
            <path d="M73.4 297.4C60.9 309.9 60.9 330.2 73.4 342.7L233.4 502.7C245.9 515.2 266.2 515.2 278.7 502.7C291.2 490.2 291.2 469.9 278.7 457.4L173.3 352L544 352C561.7 352 576 337.7 576 320C576 302.3 561.7 288 544 288L173.3 288L278.7 182.6C291.2 170.1 291.2 149.8 278.7 137.3C266.2 124.8 245.9 124.8 233.4 137.3L73.4 297.3z" />
          </svg>
        </button>

      </div>

      {/* Right Card */}
      <div
        className={`card bg-base-100 card-lg shadow-sm transition-all duration-500  ${
          primaryCard === "right" ? "w-6/8" : "w-2/8 cursor-pointer"
        }`}
        // Add onClick handler here
        onClick={() => setPrimaryCard("right")}
      >
        <div className="card-body">
          <h2 className="card-title self-center whitespace-nowrap">Login</h2>

            {/* --- Conditional Rendering Block --- */}
                {primaryCard === "right" ? (
            // If left card is primary, show the form
            <div className="flex flex-col gap-4 justify-center items-center">

              <label className="input validator">
                <svg className="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2.5" fill="none" stroke="currentColor">
                    <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                  </g>
                </svg>
                <input type="email" placeholder="mail@site.com" required />
              </label>

              <label className="input validator">
                <svg className="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2.5" fill="none" stroke="currentColor">
                    <path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"></path>
                    <circle cx="16.5" cy="7.5" r=".5" fill="currentColor"></circle>
                  </g>
                </svg>
                <input type="password" required placeholder="Password" minLength={8} pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}" title="Must be more than 8 characters, including number, lowercase letter, uppercase letter" />
              </label>
                <a className="link link-secondary">Forgot your password?</a>

            
              <button className="btn btn-neutral-content btn-outline btn-wide">Log in</button>
            
            </div>
            
            
          ) : (
            // If right card is primary, show this text instead
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="font-semibold">Have an account?<br />Log in using your existing credentials</p>
              <p className="text-sm opacity-70 mt-1">Click the arrow or click here to expand this form!</p>
            </div>
          )}


        </div>
      </div>
      </div>
</section>
    </>
  );
}