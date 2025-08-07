import { SwapCardProps } from './types';

export default function SwapDividerButton({ primaryCard, setPrimaryCard }: SwapCardProps) {
  return (
    <div className="flex items-center justify-center hidden md:flex">
      <button
        onClick={() => setPrimaryCard(primaryCard === 'left' ? 'right' : 'left')}
        className="btn btn-circle btn-outline bg-base-100"
        title="Swap Login Methods"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 640 640"
          className={`h-6 w-6 transition-transform duration-500 ease-in-out ${primaryCard === 'left' ? 'rotate-180' : 'rotate-0'}`}
          fill="currentColor"
        >
          <path d="M73.4 297.4C60.9 309.9 60.9 330.2 73.4 342.7L233.4 502.7C245.9 515.2 266.2 515.2 278.7 502.7C291.2 490.2 291.2 469.9 278.7 457.4L173.3 352L544 352C561.7 352 576 337.7 576 320C576 302.3 561.7 288 544 288L173.3 288L278.7 182.6C291.2 170.1 291.2 149.8 278.7 137.3C266.2 124.8 245.9 124.8 233.4 137.3L73.4 297.3z" />
        </svg>
      </button>
    </div>
  );
}
