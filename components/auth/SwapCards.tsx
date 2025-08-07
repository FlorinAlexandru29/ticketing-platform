// File: components/auth/SwapCards.tsx
'use client';
import { useState } from 'react';
import SwapCardLeft from './cards/SwapCardLeft';
import SwapCardRight from './cards/SwapCardRight';
import SwapDividerButton from './cards/SwapDividerButton';

export default function SwapCards() {
  const [primaryCard, setPrimaryCard] = useState<'left' | 'right'>('left');

  return (
    <section className="z-10 relative bg-startwhite rounded-t-3xl basis-4 flex-4 p-0 md:p-4 flex flex-wrap items-center gap-4 overflow-y-auto justify-center transition-all duration-300 ease-in-out">
      <div className="flex h-full w-full lg:w-3/5 items-center md:items-stretch flex-col md:flex-row gap-4 justify-center">
        <SwapCardLeft primaryCard={primaryCard} setPrimaryCard={setPrimaryCard} />
        <SwapDividerButton primaryCard={primaryCard} setPrimaryCard={setPrimaryCard} />
        <SwapCardRight primaryCard={primaryCard} setPrimaryCard={setPrimaryCard} />
      </div>
    </section>
  );
}