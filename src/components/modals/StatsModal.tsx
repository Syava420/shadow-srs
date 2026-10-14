'use client';

import React, { useMemo } from 'react';
import { X, Clock, Flame, Award, BarChart3, BookOpen, Target, CheckCircle2 } from 'lucide-react';
import { AppSettings, AppStats, FlashCard } from '@/types';
import { calculateMasteryPercent } from '@/lib/fsrs';
import { analyzeVocabulary } from '@/lib/vocabulary';
import { ActivityChart } from '@/components/stats/ActivityChart';

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
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const vocab = useMemo(() => analyzeVocabulary(cards), [cards]);

  const formatTime = (totalSeconds: number) => {
    if (!totalSeconds || totalSeconds <= 0) return '0 с';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.round(totalSeconds % 60);
    if (hours > 0) return `${hours} ч ${minutes} мин`;
    if (minutes > 0) return `${minutes} мин ${secs} с`;
    return `${secs} с`;
  };

  // Today's metrics
  const todayEntry = stats.dailyHistory[todayStr] || { cardsReviewed: 0, activeSeconds: 0, rememberedCount: 0 };
  const dailyGoal = settings?.dailyGoal || 20;
  const todayGoalPercent = Math.min(100, Math.round((todayEntry.cardsReviewed / dailyGoal) * 100));
  const todayRemembered = todayEntry.rememberedCount ?? 0;
  const todayWinrate = todayEntry.cardsReviewed > 0 && todayEntry.rememberedCount !== undefined
    ? Math.round((todayRemembered / todayEntry.cardsReviewed) * 100)
    : (todayEntry.cardsReviewed > 0 ? 100 : null);

  // Mastery levels breakdown
  let mastered100 = 0;
  let learning = 0;
  let newCards = 0;

  cards.forEach(c => {
    const p = calculateMasteryPercent(c);
    if (p >= 90) mastered100++;
    else if (p > 0) learning++;
    else newCards++;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="w-full max-w-2xl bg-[#121215] border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-800/90 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
              <BarChart3 className="w-4 h-4 text-zinc-200" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100">
                Статистика и аналитика
              </h3>
              <p className="text-xs text-zinc-400">
                Интервальные повторения FSRS и прогресс словарного запаса
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. TODAY'S HERO SECTION */}
        <div className="p-4 rounded-2xl bg-[#09090b] border border-zinc-800/90 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                Сегодня
              </span>
              <span className="text-xs text-zinc-500 font-mono">
                {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' })}
              </span>
            </div>
            {todayGoalPercent >= 100 ? (
              <span className="px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200 text-[11px] font-mono flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Цель выполнена
              </span>
            ) : (
              <span className="text-[11px] text-zinc-500 font-mono">
                Цель: {dailyGoal} карт
              </span>
            )}
          </div>

          {/* Goal progress bar */}
          <div className="space-y-1">
            <div className="w-full h-1.5 rounded-full bg-zinc-850 overflow-hidden">
              <div
                className="h-full bg-zinc-200 rounded-full transition-all duration-500"
                style={{ width: `${todayGoalPercent}%` }}
              />
            </div>
          </div>

          {/* 3 Metrics: Cards, Focus Time, Winrate */}
          <div className="grid grid-cols-3 gap-2.5 pt-1 border-t border-zinc-850">
            {/* Cards today */}
            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-center">
              <div className="text-[11px] text-zinc-500 mb-0.5">Карточек</div>
              <div className="text-lg font-bold font-mono text-zinc-100">
                {todayEntry.cardsReviewed}
                <span className="text-xs text-zinc-500 font-normal"> / {dailyGoal}</span>
              </div>
              <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                {todayGoalPercent}% нормы
              </div>
            </div>

            {/* Active focus time */}
            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-center">
              <div className="text-[11px] text-zinc-500 mb-0.5">В фокусе</div>
              <div className="text-lg font-bold font-mono text-zinc-100 truncate">
                {formatTime(todayEntry.activeSeconds)}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                чистое время
              </div>
            </div>

            {/* Winrate */}
            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-center">
              <div className="text-[11px] text-zinc-500 mb-0.5">Точность</div>
              <div className="text-lg font-bold font-mono text-zinc-100">
                {todayWinrate !== null ? `${todayWinrate}%` : '—'}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate">
                {todayEntry.cardsReviewed > 0 ? `${todayRemembered}/${todayEntry.cardsReviewed} вспомнил` : 'нет повторений'}
              </div>
            </div>
          </div>
        </div>

        {/* 2. OVERALL METRICS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-2xl bg-[#09090b] border border-zinc-800/80">
            <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Серия дней</span>
            </div>
            <div className="text-lg font-bold text-zinc-100 font-mono">
              {getPluralDays(stats.streakDays || 1)}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#09090b] border border-zinc-800/80">
            <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Всего время</span>
            </div>
            <div className="text-lg font-bold text-zinc-100 font-mono truncate">
              {formatTime(stats.totalActiveSeconds)}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#09090b] border border-zinc-800/80">
            <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>Закреплено</span>
            </div>
            <div className="text-lg font-bold text-zinc-100 font-mono">
              {mastered100} <span className="text-xs text-zinc-500 font-normal">фраз</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#09090b] border border-zinc-800/80">
            <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
              <BookOpen className="w-3.5 h-3.5 text-purple-400" />
              <span>Словарь</span>
            </div>
            <div className="text-lg font-bold text-zinc-100 font-mono">
              {vocab.totalUniqueWords} <span className="text-xs text-zinc-500 font-normal">слов</span>
            </div>
          </div>
        </div>

        {/* 3. ACTIVITY DYNAMICS (DECOMPOSED TO SEPARATE COMPONENT) */}
        <ActivityChart
          dailyHistory={stats.dailyHistory}
          formatTime={formatTime}
        />

        {/* 4. CEFR LEVEL & VOCABULARY */}
        <div className="p-4 rounded-2xl bg-[#09090b] border border-zinc-800/90 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Target className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                  Твой уровень языка (CEFR)
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-zinc-100 font-mono tracking-tight">
                  {vocab.currentLevel.level}
                </span>
                <span className="text-sm font-semibold text-zinc-300">
                  {vocab.currentLevel.title}
                </span>
                <span className="text-xs text-zinc-500 hidden sm:inline">
                  — {vocab.currentLevel.description}
                </span>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-[11px] text-zinc-500">Выучено уникальных слов</div>
              <div className="text-lg font-bold font-mono text-zinc-100">
                {vocab.masteredWordsCount} <span className="text-xs text-zinc-500 font-normal">/ {vocab.totalUniqueWords}</span>
              </div>
            </div>
          </div>

          {vocab.nextLevel && (
            <div className="space-y-1.5 pt-2 border-t border-zinc-850">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">
                  До уровня <strong>{vocab.nextLevel.level} ({vocab.nextLevel.title})</strong>:
                </span>
                <span className="font-mono text-zinc-300">
                  ещё {vocab.wordsToNextLevel} слов ({vocab.progressPercent}%)
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-zinc-850 overflow-hidden">
                <div
                  className="h-full bg-zinc-300 rounded-full transition-all duration-500"
                  style={{ width: `${vocab.progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 5. RECENT MASTERED WORDS */}
        {vocab.recentWords.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-[#09090b] border border-zinc-800/80 space-y-2">
            <div className="text-xs font-semibold text-zinc-400">
              Слова, закрепленные в долговременной памяти:
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {vocab.recentWords.map(word => (
                <span
                  key={word}
                  className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300"
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-1">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-100 text-zinc-950 text-xs font-medium cursor-pointer transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
