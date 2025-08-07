export interface SwapCardProps {
  primaryCard: 'left' | 'right';
  setPrimaryCard: React.Dispatch<React.SetStateAction<'left' | 'right'>>;
}
