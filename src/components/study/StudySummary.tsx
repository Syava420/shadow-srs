'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, ArrowLeft, RotateCcw, Zap } from 'lucide-react';

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
        particleCount: 50,
        spread: 60,
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
      <div className="w-16 h-16 rounded-3xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-200 mb-6 shadow-xl">
        <Trophy className="w-8 h-8 text-amber-400/90" />
      </div>

      <h2 className="text-2xl md:text-3xl font-bold text-zinc-100 mb-2">
        {unresolvedCount === 0 ? 'Отличная работа!' : 'Тренировка завершена!'}
      </h2>
      <p className="text-sm text-zinc-400 max-w-md mb-6">
        {timeSpentMinutes && timeSpentMinutes > 0
          ? `Сессия на ${timeSpentMinutes} минут завершена.`
          : 'Карточки запланированной сессии пройдены.'}
      </p>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-xs mb-6 text-left">
        <div className="p-4 rounded-2xl bg-[#121215] border border-zinc-800/80">
          <div className="text-[11px] text-zinc-500 mb-1">Пройдено</div>
          <div className="text-xl font-bold text-zinc-200 font-mono">{totalReviewed} шт.</div>
        </div>
        <div className="p-4 rounded-2xl bg-[#121215] border border-zinc-800/80">
          <div className="text-[11px] text-zinc-500 mb-1">Успешность</div>
          <div className="text-xl font-bold text-emerald-400 font-mono">{retentionPercent}%</div>
        </div>
      </div>

      {/* Notice if forgotten cards remain */}
      {unresolvedCount > 0 && (
        <div className="w-full max-w-xs mb-6 p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 text-center flex items-center justify-center gap-2">
          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Осталось <strong>{unresolvedCount} забытых слов</strong>.
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        {unresolvedCount > 0 && onReviewForgotten && (
          <button
            onClick={onReviewForgotten}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs transition-all cursor-pointer shadow-lg hover:scale-[1.02]"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>🔥 Добить забытые слова ({unresolvedCount} шт.)</span>
          </button>
        )}

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
          <span>Повторить всю сессию</span>
        </button>
      </div>
    </div>
  );
};

