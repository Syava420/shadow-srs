'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, ArrowLeft, RotateCcw } from 'lucide-react';

interface StudySummaryProps {
  totalReviewed: number;
  rememberedCount: number;
  onExit: () => void;
  onRestart: () => void;
}

export const StudySummary: React.FC<StudySummaryProps> = ({
  totalReviewed,
  rememberedCount,
  onExit,
  onRestart,
}) => {
  useEffect(() => {
    // Launch celebratory confetti
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#a1a1aa', '#71717a', '#d4d4d8', '#ffffff'],
    });
  }, []);

  const retentionPercent = totalReviewed > 0 
    ? Math.round((rememberedCount / totalReviewed) * 100) 
    : 100;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-16 h-16 rounded-3xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-200 mb-6 shadow-xl">
        <Trophy className="w-8 h-8 text-amber-400/90" />
      </div>

      <h2 className="text-2xl md:text-3xl font-bold text-zinc-100 mb-2">
        Отличная работа!
      </h2>
      <p className="text-sm text-zinc-400 max-w-md mb-8">
        Все запланированные карточки на сегодня успешно пройдены по алгоритму FSRS.
      </p>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-xs mb-8 text-left">
        <div className="p-4 rounded-2xl bg-[#121215] border border-zinc-800/80">
          <div className="text-[11px] text-zinc-500 mb-1">Повторено</div>
          <div className="text-xl font-bold text-zinc-200 font-mono">{totalReviewed} шт.</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#121215] border border-zinc-800/80">
          <div className="text-[11px] text-zinc-500 mb-1">Успешность</div>
          <div className="text-xl font-bold text-emerald-400 font-mono">{retentionPercent}%</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onExit}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-medium text-xs transition-colors cursor-pointer shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>К списку колод</span>
        </button>

        <button
          onClick={onRestart}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-medium text-xs transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Повторить ещё раз</span>
        </button>
      </div>
    </div>
  );
};
