import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfo, faTicket, faUser } from '@fortawesome/free-solid-svg-icons';
import { faSpotify } from '@fortawesome/free-brands-svg-icons';
import { DockProps } from '@/components/auth/cards/types';
export default function Dock({ dock, setDock }: DockProps) {

  return (
    <>
      <div className="relative dock dock-md md:hidden">
        <button className={`${dock === 'left' ? 'dock-active' : ''}`} onClick={() => setDock('left')}>
          <FontAwesomeIcon icon={faInfo} />
          <span className="dock-label">Profile</span>
        </button>

        <button className={`${dock === 'right' ? 'dock-active' : ''}`} onClick={() => setDock('right')}>
          <FontAwesomeIcon icon={faTicket} />
          <span className="dock-label">Tickets</span>
        </button>
      </div>
    </>
  );
}