'use client';

import React, { useMemo } from 'react';
import { X, Clock, Flame, Award, BarChart3, BookOpen, Target, CheckCircle2 } from 'lucide-react';
import { AppSettings, AppStats, FlashCard } from '@/types';
import { calculateMasteryPercent } from '@/lib/fsrs';
import { analyzeVocabulary } from '@/lib/vocabulary';
import { ActivityChart } from '@/components/stats/ActivityChart';
import { getLocalDateString } from '@/lib/date-utils';
import { ModalDialog } from './ModalDialog';

interface StatsModalProps {
  isOpen: boolean;
  stats: AppStats;
  cards: FlashCard[];
  settings?: AppSettings;
  onClose: () => void;
}

function getPluralDays(n: number): string {
  const abs = Math.abs(n);
  const n10 = abs % 10;
  const n100 = abs % 100;
  if (n100 >= 11 && n100 <= 19) return `${n} дней`;
  if (n10 === 1) return `${n} день`;
  if (n10 >= 2 && n10 <= 4) return `${n} дня`;
  return `${n} дней`;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  stats,
  cards,
  settings,
  onClose,
}) => {
  const todayStr = useMemo(() => getLocalDateString(), []);
  const vocab = useMemo(() => analyzeVocabulary(cards), [cards]);

  const formatTime = (totalSeconds: number) => {
    if (!totalSeconds || totalSeconds <= 0) return '0 с';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.round(totalSeconds % 60);
    if (hours > 0) return `${hours} ч ${minutes} мин`;
    if (minutes > 0) return `${minutes} мин`;
    return `${secs} с`;
  };

  const todayEntry = stats.dailyHistory[todayStr] || {
    cardsReviewed: 0,
    activeSeconds: 0,
    rememberedCount: 0,
    uniqueCardIds: [],
    firstTryRememberedIds: [],
  };

  const dailyGoal = settings?.dailyGoal || 20;
  const todayUniqueCards = todayEntry.uniqueCardIds
    ? todayEntry.uniqueCardIds.length
    : todayEntry.cardsReviewed;
  const todayTotalReviews = todayEntry.cardsReviewed;
  const todayGoalPercent = Math.min(100, Math.round((todayUniqueCards / dailyGoal) * 100));

  const hasFirstTryData =
    todayEntry.firstTryRememberedIds !== undefined && todayEntry.uniqueCardIds !== undefined;
  const hasRememberedData = todayEntry.rememberedCount !== undefined;

  let todayWinrate: number | null = null;
  let winrateSubtext = '';

  if (hasFirstTryData && todayUniqueCards > 0) {
    const firstTryCount = todayEntry.firstTryRememberedIds?.length || 0;
    todayWinrate = Math.round((firstTryCount / todayUniqueCards) * 100);
    winrateSubtext = `${firstTryCount} из ${todayUniqueCards}`;
  } else if (hasRememberedData && todayTotalReviews > 0) {
    todayWinrate = Math.round((todayEntry.rememberedCount! / todayTotalReviews) * 100);
    winrateSubtext = `${todayEntry.rememberedCount} из ${todayTotalReviews}`;
  } else if (todayTotalReviews > 0) {
    winrateSubtext = 'с новой сессии';
  } else {
    winrateSubtext = 'нет повторений';
  }

  const masteredCount = cards.filter((c) => calculateMasteryPercent(c) >= 90).length;

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledBy="stats-title"
      className="w-[calc(100%-1.5rem)] max-w-2xl bg-[#111216] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl text-zinc-100"
    >
      <div className="space-y-5 max-h-[82dvh] overflow-y-auto pr-1">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-zinc-400" />
            <h2 id="stats-title" className="text-base font-semibold text-zinc-100">
              Статистика
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Today Hero */}
        <div className="p-4 rounded-xl bg-zinc-950 border border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-200">
              Сегодня ·{' '}
              <span className="text-zinc-400 font-normal">
                {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
              </span>
            </span>
            {todayGoalPercent >= 100 ? (
              <span className="px-2 py-0.5 rounded-md bg-zinc-800 border border-white/10 text-zinc-200 text-[11px] font-mono flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Цель выполнена
              </span>
            ) : (
              <span className="text-[11px] text-zinc-500 font-mono tabular-nums">
                Цель: {dailyGoal} карт
              </span>
            )}
          </div>

          <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden">
            <div
              className="h-full bg-zinc-300 rounded-full transition-all duration-500"
              style={{ width: `${todayGoalPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-white/[0.06]">
            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.05] text-center">
              <div className="text-[11px] text-zinc-500">Карточек</div>
              <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-zinc-100">
                {todayUniqueCards}
                <span className="text-xs text-zinc-500 font-normal"> / {dailyGoal}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.05] text-center">
              <div className="text-[11px] text-zinc-500">В фокусе</div>
              <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-zinc-100">
                {formatTime(todayEntry.activeSeconds)}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.05] text-center">
              <div className="text-[11px] text-zinc-500">Точность</div>
              <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-zinc-100">
                {todayWinrate !== null ? `${todayWinrate}%` : '—'}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono truncate">{winrateSubtext}</div>
            </div>
          </div>
        </div>

        {/* Overall Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-xl bg-zinc-950 border border-white/[0.06]">
            <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Серия</span>
            </div>
            <div className="text-base font-bold text-zinc-100 font-mono tabular-nums">
              {getPluralDays(stats.streakDays || 1)}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950 border border-white/[0.06]">
            <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>Время</span>
            </div>
            <div className="text-base font-bold text-zinc-100 font-mono tabular-nums truncate">
              {formatTime(stats.totalActiveSeconds)}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950 border border-white/[0.06]">
            <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>Закреплено</span>
            </div>
            <div className="text-base font-bold text-zinc-100 font-mono tabular-nums">
              {masteredCount} <span className="text-xs text-zinc-500 font-normal">фраз</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950 border border-white/[0.06]">
            <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
              <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
              <span>Словарь</span>
            </div>
            <div className="text-base font-bold text-zinc-100 font-mono tabular-nums">
              {vocab.totalUniqueWords} <span className="text-xs text-zinc-500 font-normal">слов</span>
            </div>
          </div>
        </div>

        {/* Activity Chart */}
        <ActivityChart dailyHistory={stats.dailyHistory} formatTime={formatTime} />

        {/* CEFR */}
        <div className="p-4 rounded-xl bg-zinc-950 border border-white/[0.06] space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-xs font-semibold text-zinc-300">
                Уровень: <strong className="text-zinc-100 font-mono">{vocab.currentLevel.level}</strong> ({vocab.currentLevel.title})
              </span>
            </div>
            <span className="text-xs font-mono text-zinc-400 tabular-nums">
              {vocab.masteredWordsCount} / {vocab.totalUniqueWords} слов
            </span>
          </div>

          {vocab.nextLevel && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span>До {vocab.nextLevel.level}: ещё {vocab.wordsToNextLevel} слов</span>
                <span className="font-mono tabular-nums">{vocab.progressPercent}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden">
                <div
                  className="h-full bg-zinc-400 rounded-full transition-all duration-500"
                  style={{ width: `${vocab.progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalDialog>
  );
};
