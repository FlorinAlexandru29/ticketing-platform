import React, { useState } from "react";

export function SwapCards() {
  const [primaryCard, setPrimaryCard] = useState<"left" | "right">("left");

  return (
    <>
      {/* Left Card */}
      <section className={` z-10 relative bg-startwhite rounded-t-3xl basis-4 flex-4 p-0 md:p-4 flex flex-wrap items-center gap-4 overflow-y-auto justify-center transition-all duration-300 ease-in-out`}>
        <div className="flex h-full w-full lg:w-3/5 items-center md:items-stretch flex-col md:flex-row gap-4 transition-all duration-300 ease-in-out justify-center">

      <div
        className={`card bg-base-100 card-lg shadow-sm transition-all duration-500 h-full ${
          primaryCard === "left" ? "w-6/10" : "w-2/8 cursor-pointer hidden md:flex" 
        }`}
        // Add onClick handler here
        onClick={() => setPrimaryCard("left")}
      >
        <div className="card-body">
          <h2 className="card-title self-center whitespace-nowrap">Create an account</h2>

          {/* --- Conditional Rendering Block --- */}
          {primaryCard === "left" ? (
            // If left card is primary, show the form
               <div className="flex flex-col gap-4 justify-between h-full items-center">
                  {/* Added mt-auto to push the input group lower from the title */}
                  <div className="input-group flex flex-col gap-0 md:gap-2 w-full items-center mt-0 md:mt-10">
           

              <input type="text" className="input validator" required placeholder="Username" 
              pattern="[A-Za-z][A-Za-z0-9\-]*" minLength={3} maxLength={30} title="Only letters" />
            <p className="validator-hint">
              Must be 3 to 30 characters containing only letters
            </p>

            <input className="input validator" type="email" required placeholder="mail@site.com" />
            <div className="validator-hint">Enter valid email address</div>

            <input type="password" className="input validator" required placeholder="Password" minLength={8} 
            pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}" 
            title="Must be more than 8 characters, including number, lowercase letter, uppercase letter" />
          <p className="validator-hint">
            Must be more than 8 characters, including
                <br/>At least one number
                <br/>At least one lowercase letter
                <br/>At least one uppercase letter
          </p>

            </div>
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
      <div className="flex items-center justify-center hidden md:flex">
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
        className={`card bg-base-100 card-lg shadow-sm transition-all duration-500 h-full  ${
          primaryCard === "right" ? "w-6/10" : "w-2/8 cursor-pointer hidden md:flex"
        }`}
        // Add onClick handler here
        onClick={() => setPrimaryCard("right")}
      >
        <div className="card-body">
          <h2 className="card-title self-center whitespace-nowrap">Login</h2>

            {/* --- Conditional Rendering Block --- */}
                {primaryCard === "right" ? (
            // If left card is primary, show the form
            <div className="flex flex-col gap-4 justify-between h-full items-center">
                  {/* Added mt-auto to push the input group lower from the title */}
                  <div className="input-group flex flex-col gap-0 md:gap-2 w-full items-center mt-0 md:mt-15">
                    {/* Added w-full to input fields to make them fill available space */}
                  
                <input className="input validator" type="email" required placeholder="mail@site.com" />
                <div className="validator-hint">Enter valid email address</div>

                <input type="password" className="input validator" required placeholder="Password" minLength={8} 
                pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}" 
                title="Must be more than 8 characters, including number, lowercase letter, uppercase letter" />
              <p className="validator-hint">
                Must be more than 8 characters, including
                <br/>At least one number
                <br/>At least one lowercase letter
                <br/>At least one uppercase letter
              </p>

                

            </div>
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