import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';
import { faSpotify } from '@fortawesome/free-brands-svg-icons';
import { dockProps } from '@/components/auth/cardsv2/types';
export default function Dock({ dock, setDock }: dockProps) {

  return (
    <>
      <div className="relative dock dock-md sm:hidden">
        <button className={`${dock === 'left' ? 'dock-active' : ''}`} onClick={() => setDock('left')}>
          <FontAwesomeIcon icon={faUser} />
          <span className="dock-label">Login</span>
        </button>

        <button className={`${dock === 'right' ? 'dock-active' : ''}`} onClick={() => setDock('right')}>
          <FontAwesomeIcon icon={faSpotify} />
          <span className="dock-label">Spotify Login</span>
        </button>
      </div>
    </>
  );
}