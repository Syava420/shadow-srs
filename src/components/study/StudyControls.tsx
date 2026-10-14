'use client';

import React, { useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { FlashCard } from '@/types';
import { getNextIntervalText } from '@/lib/fsrs';

interface StudyControlsProps {
  card: FlashCard;
  isFlipped: boolean;
  onFlip: () => void;
  onRate: (isRemembered: boolean) => void;
  onReplayAudio: () => void;
}

export const StudyControls: React.FC<StudyControlsProps> = ({
  card,
  isFlipped,
  onFlip,
  onRate,
  onReplayAudio,
}) => {
  const forgotInterval = getNextIntervalText(card, false);
  const rememberedInterval = getNextIntervalText(card, true);

  // Keyboard navigation handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        onFlip();
      } else if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') {
        e.preventDefault();
        onReplayAudio();
      } else if (e.key === '1' || e.key === 'ArrowLeft') {
        e.preventDefault();
        onRate(false);
      } else if (e.key === '2' || e.key === 'ArrowRight') {
        e.preventDefault();
        onRate(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onFlip, onRate, onReplayAudio]);

  return (
    <div className="w-full max-w-lg grid grid-cols-2 gap-3 select-none">
      {/* ЗАБЫЛ (1 / ←) */}
      <button
        onClick={() => onRate(false)}
        className="py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-850 active:scale-[0.98] border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
      >
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-200">
          <X className="w-3.5 h-3.5 text-zinc-400" />
          <span>Забыл</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-zinc-500">1</kbd>
        </div>
        <span className="text-[11px] font-mono text-zinc-500">
          Повтор: {forgotInterval.toLowerCase()}
        </span>
      </button>

      {/* ВСПОМНИЛ (2 / →) */}
      <button
        onClick={() => onRate(true)}
        className="py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-850 active:scale-[0.98] border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
      >
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-200">
          <Check className="w-3.5 h-3.5 text-zinc-400" />
          <span>Вспомнил</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-zinc-500">2</kbd>
        </div>
        <span className="text-[11px] font-mono text-zinc-500">
          Повтор: {rememberedInterval.startsWith('Завтра') ? 'Завтра' : `через ${rememberedInterval}`}
        </span>
      </button>
    </div>
  );
};
