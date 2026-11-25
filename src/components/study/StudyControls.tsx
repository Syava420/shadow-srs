'use client';

import React, { useEffect } from 'react';
import { RotateCcw, Check } from 'lucide-react';
import { FlashCard } from '@/types';
import { getNextIntervalText } from '@/lib/fsrs';

interface StudyControlsProps {
  card: FlashCard;
  isFlipped: boolean;
  disabled?: boolean;
  onFlip: () => void;
  onRate: (isRemembered: boolean) => void;
  onReplayAudio: () => void;
}

export const StudyControls: React.FC<StudyControlsProps> = ({
  card,
  isFlipped,
  disabled = false,
  onFlip,
  onRate,
  onReplayAudio,
}) => {
  const forgotInterval = getNextIntervalText(card, false);
  const rememberedInterval = getNextIntervalText(card, true);

  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        onFlip();
      } else if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') {
        e.preventDefault();
        onReplayAudio();
      } else if (isFlipped && (e.key === '1' || e.key === 'ArrowLeft')) {
        e.preventDefault();
        onRate(false);
      } else if (isFlipped && (e.key === '2' || e.key === 'ArrowRight' || e.key === 'Enter')) {
        e.preventDefault();
        onRate(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, isFlipped, onFlip, onRate, onReplayAudio]);

  if (!isFlipped) {
    return (
      <div className="w-full max-w-lg select-none">
        <button
          type="button"
          onClick={onFlip}
          className="w-full py-3.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-[0.99] border border-white/15 text-zinc-100 text-sm font-medium transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2"
        >
          <span>Показать ответ</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-zinc-900 border border-white/10 text-[10px] font-mono text-zinc-400">
            Пробел
          </kbd>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg grid grid-cols-2 gap-3 select-none animate-fadeIn">
      {/* 1: Не помню (1 / ←) */}
      <button
        type="button"
        onClick={() => onRate(false)}
        className="py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 hover:border-rose-500/35 active:scale-[0.98] border border-white/[0.08] text-zinc-200 hover:text-rose-200 transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer"
      >
        <div className="flex items-center gap-2 text-xs font-semibold">
          <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
          <span>Не помню</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-zinc-950 border border-white/[0.06] text-[10px] font-mono text-zinc-500">
            1
          </kbd>
        </div>
        <span className="text-[11px] font-mono text-zinc-500">
          {forgotInterval.toLowerCase()}
        </span>
      </button>

      {/* 2: Помню (2 / →) */}
      <button
        type="button"
        onClick={() => onRate(true)}
        className="py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] border border-white/15 hover:border-white/25 text-zinc-100 transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-sm"
      >
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Check className="w-3.5 h-3.5 text-zinc-300" />
          <span>Помню</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-zinc-900 border border-white/10 text-[10px] font-mono text-zinc-400">
            2
          </kbd>
        </div>
        <span className="text-[11px] font-mono text-zinc-400">
          {rememberedInterval.startsWith('Завтра')
            ? 'завтра'
            : rememberedInterval.startsWith('В этой')
              ? rememberedInterval.toLowerCase()
              : `через ${rememberedInterval}`}
        </span>
      </button>
    </div>
  );
};
