export interface dockProps {
  dock: 'left' | 'right';
  setDock: React.Dispatch<React.SetStateAction<'left' | 'right'>>;
}

export interface ShowPasswordProps {
  showPwd: boolean;
  setShowPwd: React.Dispatch<React.SetStateAction<boolean>>;
}

export type AuthMode = 'signin' | 'signup';


export interface AuthCardProps extends ShowPasswordProps {
  setMode: (mode: AuthMode) => void;
}