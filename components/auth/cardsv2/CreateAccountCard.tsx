import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faKey, faEye, faEyeSlash, faAt } from '@fortawesome/free-solid-svg-icons';
import type { AuthCardProps } from '@/components/auth/cardsv2/types';

export default function CreateAccountCard({ showPwd, setShowPwd, setMode }: AuthCardProps) {
    return (
        <>
            <h2 className="card-title self-center whitespace-nowrap text-[var(--heading-sz)]">
                Create an account
            </h2>

            <div className="flex-1 min-h-0 flex flex-col">
                <div className="input-group flex flex-col h-full w-full items-center mt-[calc(var(--gap-y)*2)] gap-[var(--gap-y)]">

                    <label className="input validator h-[var(--ctrl-h)] text-[var(--font-sz)]">
                        <FontAwesomeIcon icon={faUser} />
                        <input
                            type="text"
                            className=""
                            required
                            placeholder="Username"
                            pattern="[A-Za-z][A-Za-z0-9\\-]*"
                            minLength={3}
                            maxLength={30}
                            title="Only letters"
                        />
                    </label>
                    <div className="validator-hint text-[calc(var(--font-sz)*0.9)] leading-tight">
                        Must be 3 to 30 characters containing only letters
                    </div>

                    <label className="input validator h-[var(--ctrl-h)] text-[var(--font-sz)]">
                        <FontAwesomeIcon icon={faAt} />
                        <input
                            className=""
                            type="email"
                            required
                            placeholder="mail@site.com"
                        />
                    </label>
                    <div className="validator-hint text-[calc(var(--font-sz)*0.9)] leading-tight">
                        Enter valid email address
                    </div>

                    <label className="input validator h-[var(--ctrl-h)] text-[var(--font-sz)] items-center gap-2">
                        <FontAwesomeIcon icon={faKey} />

                        <input
                            type={showPwd ? 'text' : 'password'}
                            className="grow min-w-0"
                            required
                            placeholder="Password"
                            minLength={8}
                            pattern="(?=.*\\d)(?=.*[a-z])(?=.*[A-Z]).{8,}"
                            title="Must be more than 8 characters, including number, lowercase letter, uppercase letter"
                            autoComplete="new-password"
                        />

                        {/* Eye toggle with tooltip (Supabase style) */}
                        <div
                            className="tooltip tooltip-left"
                            data-tip={showPwd ? 'Hide password' : 'Show password'}
                        >
                            <button
                                type="button"
                                onClick={() => setShowPwd(v => !v)}
                                aria-pressed={showPwd}
                                aria-label={showPwd ? 'Hide password' : 'Show password'}
                                className="btn btn-ghost rounded-2xl !min-h-0 h-[calc(var(--ctrl-h)-0.4rem)] w-[calc(var(--ctrl-h)-0.4rem)] p-0"
                            >
                                <FontAwesomeIcon icon={showPwd ? faEyeSlash : faEye} />
                            </button>
                        </div>
                    </label>

                    <div className="validator-hint text-[calc(var(--font-sz)*0.9)] leading-tight [@media(max-height:690px)]:hidden!">
                        Must be more than 8 characters, including<br />
                        At least one number<br />
                        At least one lowercase letter<br />
                        At least one uppercase letter
                    </div>

                </div>
                
                <div className="flex flex-col shrink-0 h-[var(--oauth-row-h)*1.5] gap-3 justify-center items-center w-full min-w-0 mb-2">
                    <button className="link link-primary text-[var(--font-sz)] text-center mt-2"  onClick={(e) => { e.preventDefault(); setMode('signin'); }}> Or Login using an existing account </button> 
                    <button className="btn btn-neutral-content btn-outline btn-wide h-[var(--ctrl-h)] text-[var(--font-sz)]">
                        Sign up
                    </button>
                </div>
            </div>
        </>
    );
}