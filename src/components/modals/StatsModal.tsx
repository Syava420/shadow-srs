'use client';

import React, { useState, useMemo } from 'react';
import { X, Calendar, Clock, Flame, Award, BarChart3, BookOpen, ChevronRight, TrendingUp } from 'lucide-react';
import { AppStats, FlashCard } from '@/types';
import { calculateMasteryPercent } from '@/lib/fsrs';
import { analyzeVocabulary } from '@/lib/vocabulary';

interface StatsModalProps {
  isOpen: boolean;
  stats: AppStats;
  cards: FlashCard[];
  onClose: () => void;
}

type TimeRange = '7' | '30' | '60' | '180';

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  stats,
  cards,
  onClose,
}) => {
  const [range, setRange] = useState<TimeRange>('30');

  const vocab = useMemo(() => analyzeVocabulary(cards), [cards]);

  if (!isOpen) return null;

  const formatTime = (totalSeconds: number) => {
    if (!totalSeconds || totalSeconds <= 0) return '0 мин';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hours > 0) return `${hours} ч ${minutes} мин`;
    if (minutes > 0) return `${minutes} мин ${secs} сек`;
    return `${secs} сек`;
  };

  const daysCount = parseInt(range, 10);
  const daysList: { dateStr: string; label: string; count: number; seconds: number }[] = [];
  const today = new Date();

  let rangeCardsCount = 0;
  let rangeSecondsCount = 0;

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayData = stats.dailyHistory[dateStr] || { cardsReviewed: 0, activeSeconds: 0 };
    rangeCardsCount += dayData.cardsReviewed;
    rangeSecondsCount += dayData.activeSeconds;

    daysList.push({
      dateStr,
      label: d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
      count: dayData.cardsReviewed,
      seconds: dayData.activeSeconds,
    });
  }

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

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-3xl bg-[#121215] border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
              <BarChart3 className="w-4 h-4 text-zinc-200" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                Аналитика & Словарный запас
              </h3>
              <p className="text-xs text-zinc-400">
                Оценка уровня английского языка по стандарту CEFR и долгосрочной памяти FSRS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. CEFR Level & Vocabulary Banner */}
        <div className="p-5 rounded-2xl bg-[#09090b] border border-zinc-800/90 relative overflow-hidden shadow-inner">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                  Твой уровень языка (CEFR)
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-zinc-100 font-mono tracking-tight">
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

            {/* Unique Words Metrics */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[11px] text-zinc-500">Выучено слов</div>
                <div className="text-xl font-bold font-mono text-emerald-400">
                  {vocab.masteredWordsCount} <span className="text-xs text-zinc-500 font-normal">/ {vocab.totalUniqueWords}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Progress to Next Level Bar */}
          {vocab.nextLevel && (
            <div className="space-y-1.5 pt-2 border-t border-zinc-850">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 flex items-center gap-1">
                  <span>До уровня <strong>{vocab.nextLevel.level} ({vocab.nextLevel.title})</strong>:</span>
                </span>
                <span className="font-mono text-zinc-300">
                  ещё {vocab.wordsToNextLevel} слов ({vocab.progressPercent}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-850 overflow-hidden">
                <div
                  className="h-full bg-emerald-500/80 rounded-full transition-all duration-500"
                  style={{ width: `${vocab.progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 2. Highlight Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-[#09090b] border border-zinc-800/80">
            <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Ударный режим</span>
            </div>
            <div className="text-xl font-bold text-zinc-100 font-mono">
              {stats.streakDays || 1} <span className="text-xs text-zinc-500 font-normal">дней</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#09090b] border border-zinc-800/80">
            <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Чистое время</span>
            </div>
            <div className="text-xl font-bold text-zinc-100 font-mono">
              {formatTime(stats.totalActiveSeconds)}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#09090b] border border-zinc-800/80">
            <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>Фраз на 100%</span>
            </div>
            <div className="text-xl font-bold text-emerald-400 font-mono">
              {mastered100} <span className="text-xs text-zinc-500 font-normal">шт.</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#09090b] border border-zinc-800/80">
            <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
              <span>Уникальных слов</span>
            </div>
            <div className="text-xl font-bold text-zinc-100 font-mono">
              {vocab.totalUniqueWords}
            </div>
          </div>
        </div>

        {/* 3. Range Filter & Activity Grid */}
        <div className="p-4 rounded-2xl bg-[#09090b] border border-zinc-800/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              Календарь активности
            </span>

            {/* Time range switcher */}
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-0.5">
              {(['7', '30', '60', '180'] as TimeRange[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                    range === r
                      ? 'bg-zinc-800 text-zinc-100 font-bold'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {r === '180' ? 'Полгода' : `${r} дн`}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-zinc-500 flex items-center justify-between">
            <span>За выбранный период повторено: <strong className="text-zinc-200 font-mono">{rangeCardsCount}</strong> карточек</span>
            <span>Время: <strong className="text-zinc-200 font-mono">{formatTime(rangeSecondsCount)}</strong></span>
          </div>

          {/* Activity Grid (Scrollable for large ranges) */}
          <div className="max-h-48 overflow-y-auto pr-1">
            <div className="grid grid-cols-7 gap-1.5 pt-1">
              {daysList.map((day) => {
                const hasActivity = day.count > 0;
                return (
                  <div
                    key={day.dateStr}
                    title={`${day.dateStr}: ${day.count} карточек, ${formatTime(day.seconds)}`}
                    className={`p-1.5 rounded-xl border text-center transition-all ${
                      hasActivity
                        ? 'bg-zinc-800/90 border-zinc-600/80 text-zinc-100 shadow-sm'
                        : 'bg-zinc-950/40 border-zinc-850/60 text-zinc-700'
                    }`}
                  >
                    <div className="text-[9px] text-zinc-500 font-mono truncate">{day.label}</div>
                    <div className={`text-xs font-bold font-mono mt-0.5 ${hasActivity ? 'text-zinc-100' : 'text-zinc-800'}`}>
                      {day.count > 0 ? day.count : '·'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4. Vocabulary Mastered Words Preview */}
        {vocab.recentWords.length > 0 && (
          <div className="p-4 rounded-2xl bg-[#09090b] border border-zinc-800/80 space-y-2">
            <div className="text-xs font-semibold text-zinc-300">
              Слова, уже закрепленные в долговременной памяти:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {vocab.recentWords.map(word => (
                <span
                  key={word}
                  className="px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300"
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
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
