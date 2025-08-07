import { SwapCardProps } from './types';

export default function SwapCardRight({ primaryCard, setPrimaryCard }: SwapCardProps) {
  return (
    <div
      className={`card bg-base-100 card-lg shadow-sm transition-all duration-500 h-full ${
        primaryCard === 'right' ? 'w-6/10' : 'w-2/8 cursor-pointer hidden md:flex'
      }`}
      onClick={() => setPrimaryCard('right')}
    >
      <div className="card-body">
        <h2 className="card-title self-center whitespace-nowrap">Login</h2>
        {primaryCard === 'right' ? (
          <div className="flex flex-col gap-4 justify-between h-full items-center">
            <div className="input-group flex flex-col gap-0 md:gap-2 w-full items-center mt-0 md:mt-15">
              <input className="input validator" type="email" required placeholder="mail@site.com" />
              <div className="validator-hint">Enter valid email address</div>
              <input type="password" className="input validator" required placeholder="Password" minLength={8} pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}" title="Must be more than 8 characters, including number, lowercase letter, uppercase letter" />
              <p className="validator-hint">Must be more than 8 characters, including<br/>At least one number<br/>At least one lowercase letter<br/>At least one uppercase letter</p>
            </div>
            <a className="link link-secondary">Forgot your password?</a>
            <button className="btn btn-neutral-content btn-outline btn-wide">Log in</button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="font-semibold">Have an account?<br />Log in using your existing credentials</p>
            <p className="text-sm opacity-70 mt-1">Click the arrow or click here to expand this form!</p>
          </div>
        )}
      </div>
    </div>
  );
}