import type { Dispatch, SetStateAction } from 'react';

export type DockSide = 'left' | 'right';
export type AuthMode = 'signin' | 'signup';

/** For components that control the password visibility toggle */
export interface ShowPasswordProps {
  showPwd: boolean;
  setShowPwd: Dispatch<SetStateAction<boolean>>;
}

/** For auth cards that can switch between signin/signup */
export interface AuthCardProps extends ShowPasswordProps {
  setMode: (mode: AuthMode) => void;
}

/** Mobile dock switcher */
export interface DockProps {
  dock: DockSide;
  setDock: (side: DockSide) => void;
  className?: string;
}
