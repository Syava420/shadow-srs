'use client';

import React, { useEffect } from 'react';
import { XCircle, CheckCircle2 } from 'lucide-react';
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
    <div className="w-full max-w-xl grid grid-cols-2 gap-4">
      {/* ЗАБЫЛ (1 / ←) */}
      <button
        onClick={() => onRate(false)}
        className="py-3 px-5 rounded-2xl bg-[#140e10] hover:bg-[#1a1113] active:scale-95 text-zinc-300 hover:text-red-300 border border-red-950/60 hover:border-red-900 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer shadow-md group"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-red-400 group-hover:text-red-300">
          <XCircle className="w-4 h-4" />
          <span>Забыл</span>
        </div>
        <span className="text-[10px] font-mono text-zinc-600 group-hover:text-zinc-500">
          {forgotInterval}
        </span>
      </button>

      {/* ВСПОМНИЛ (2 / →) */}
      <button
        onClick={() => onRate(true)}
        className="py-3 px-5 rounded-2xl bg-[#0e1611] hover:bg-[#121e16] active:scale-95 text-zinc-300 hover:text-emerald-300 border border-emerald-950/60 hover:border-emerald-900 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer shadow-md group"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400 group-hover:text-emerald-300">
          <CheckCircle2 className="w-4 h-4" />
          <span>Вспомнил</span>
        </div>
        <span className="text-[10px] font-mono text-zinc-600 group-hover:text-zinc-500">
          {rememberedInterval}
        </span>
      </button>
    </div>
  );
};
