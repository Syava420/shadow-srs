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
    // Launch celebratory confetti if completed without forgotten backlog or good score
    if (unresolvedCount === 0) {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#a1a1aa', '#71717a', '#d4d4d8', '#ffffff'],
      });
    }
  }, [unresolvedCount]);

  const retentionPercent = totalReviewed > 0 
    ? Math.round((rememberedCount / totalReviewed) * 100) 
    : 100;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 mb-5 shadow-sm">
        <CheckCheck className="w-6 h-6 text-zinc-300" />
      </div>

      <h2 className="text-xl md:text-2xl font-semibold text-zinc-100 mb-2">
        {unresolvedCount === 0 ? 'Сессия завершена' : 'Тренировка окончена'}
      </h2>
      <p className="text-xs text-zinc-400 max-w-md mb-6">
        {timeSpentMinutes && timeSpentMinutes > 0
          ? `Сессия на ${timeSpentMinutes} минут завершена.`
          : 'Карточки запланированной сессии пройдены.'}
      </p>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-6 text-left">
        <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <div className="text-[11px] text-zinc-500 mb-1 font-mono">Пройдено</div>
          <div className="text-lg font-semibold text-zinc-200 font-mono">{totalReviewed} шт.</div>
        </div>
        <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <div className="text-[11px] text-zinc-500 mb-1 font-mono">Успешность</div>
          <div className="text-lg font-semibold text-zinc-200 font-mono">{retentionPercent}%</div>
        </div>
      </div>

      {/* Notice if forgotten cards remain */}
      {unresolvedCount > 0 && (
        <div className="w-full max-w-xs mb-6 p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300 text-center flex items-center justify-center gap-2">
          <RotateCcw className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span>
            Осталось <strong>{unresolvedCount} забытых слов</strong>.
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {unresolvedCount > 0 && onReviewForgotten && (
          <button
            onClick={onReviewForgotten}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-medium text-xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Повторить забытые ({unresolvedCount})</span>
          </button>
        )}

        <button
          onClick={onExit}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 font-medium text-xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>К списку колод</span>
        </button>

        <button
          onClick={onRestart}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 font-medium text-xs transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Повторить всю сессию</span>
        </button>
      </div>
    </div>
  );
};

