'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CheckCheck, ArrowLeft, RotateCcw } from 'lucide-react';

interface StudySummaryProps {
  totalReviewed: number;
  rememberedCount: number;
  timeSpentMinutes?: number;
  unresolvedCount?: number;
  onReviewForgotten?: () => void;
  onExit: () => void;
  onRestart: () => void;
}

export const StudySummary: React.FC<StudySummaryProps> = ({
  totalReviewed,
  rememberedCount,
  timeSpentMinutes,
  unresolvedCount = 0,
  onReviewForgotten,
  onExit,
  onRestart,
}) => {
  useEffect(() => {
    if (unresolvedCount === 0 && totalReviewed > 0) {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#a1a1aa', '#71717a', '#d4d4d8', '#ffffff'],
      });
    }
  }, [unresolvedCount, totalReviewed]);

  const retentionPercent =
    totalReviewed > 0 ? Math.round((rememberedCount / totalReviewed) * 100) : 100;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-300 mb-4">
        <CheckCheck className="w-6 h-6" />
      </div>

      <h2 className="text-xl sm:text-2xl font-semibold text-zinc-100 mb-1.5">
        {unresolvedCount === 0 ? 'Сессия завершена' : 'Тренировка окончена'}
      </h2>
      <p className="text-xs text-zinc-400 max-w-md mb-6">
        {timeSpentMinutes && timeSpentMinutes > 0
          ? `Сессия на ${timeSpentMinutes} мин завершена.`
          : 'Карточки этой сессии пройдены.'}
      </p>

      <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-6 text-left">
        <div className="p-3.5 rounded-xl bg-[#111216] border border-white/[0.08]">
          <div className="text-[11px] text-zinc-500 mb-0.5 font-mono">Пройдено</div>
          <div className="text-lg font-semibold text-zinc-100 font-mono tabular-nums">
            {totalReviewed}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#111216] border border-white/[0.08]">
          <div className="text-[11px] text-zinc-500 mb-0.5 font-mono">Точность</div>
          <div className="text-lg font-semibold text-zinc-100 font-mono tabular-nums">
            {retentionPercent}%
          </div>
        </div>
      </div>

      {unresolvedCount > 0 && (
        <div className="w-full max-w-xs mb-6 p-3 rounded-xl bg-zinc-900 border border-white/[0.08] text-xs text-zinc-300 flex items-center justify-center gap-2">
          <RotateCcw className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span>
            Незакреплённых: <strong>{unresolvedCount}</strong>
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {unresolvedCount > 0 && onReviewForgotten && (
          <button
            type="button"
            onClick={onReviewForgotten}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-white/15 font-medium text-xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Повторить забытые ({unresolvedCount})</span>
          </button>
        )}

        <button
          type="button"
          onClick={onExit}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/[0.08] text-zinc-300 font-medium text-xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>К колоде</span>
        </button>

        <button
          type="button"
          onClick={onRestart}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/[0.08] text-zinc-300 font-medium text-xs transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Повторить ещё</span>
        </button>
      </div>
    </div>
  );
};
