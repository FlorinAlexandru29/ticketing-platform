import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogle, faFacebook, } from '@fortawesome/free-brands-svg-icons';

export const LoginSocialCard = () => {
  return (
    <>
      <div className="divider my-[var(--gap-y)]">Or Sign In with</div>

      {/* Fixed-height row for OAuth buttons (aligns with Spotify row) */}
      <div className="flex flex-wrap shrink-0 h-[var(--oauth-row-h)] gap-3 justify-center items-center w-full min-w-0">
        <button
          className="btn btn-soft sm:w-auto md:w-[clamp(10rem,45%,16rem)] max-w-full
                             h-[var(--ctrl-h)] text-[var(--font-sz)]"
        >
          <FontAwesomeIcon icon={faGoogle} />
          <span className="ml-2">Google</span>
        </button>
        <button
          className="btn btn-soft sm:w-auto md:w-[clamp(10rem,45%,16rem)] max-w-full
                             h-[var(--ctrl-h)] text-[var(--font-sz)]"
        >
          <FontAwesomeIcon icon={faFacebook} />
          <span className="ml-2">Facebook</span>
        </button>
      </div>
    </>);
}