'use client';

import React, { useMemo } from 'react';
import { Deck, AppSettings, DirectionMode } from '@/types';
import { calculateDeckStats } from '@/lib/fsrs';
import { BatchComposition } from './deck-helpers';
import { Play, Pencil, Trash2 } from 'lucide-react';

interface DeckStartHubProps {
  deck: Deck;
  stats: ReturnType<typeof calculateDeckStats>;
  settings: AppSettings;
  effectiveDailyNew: number;
  dailyNewOverride: number | null;
  newLearnedToday: number;
  studyBatchBreakdown: BatchComposition;
  directionMode: DirectionMode;
  onChangeDirection: (mode: DirectionMode) => void;
  onChangeTodayNewLimit: (limit: number | null) => void;
  onUpdateSettings: (settings: AppSettings) => void;
  onStartStudy: (deckId: string, directionMode?: DirectionMode, cardLimit?: number) => void;
  onOpenSimulator: () => void;
  onEditDeck?: (deck: Deck) => void;
  onDeleteDeck?: (deckId: string) => void;
}

export const DeckStartHub: React.FC<DeckStartHubProps> = ({
  deck,
  stats,
  settings,
  effectiveDailyNew,
  dailyNewOverride,
  newLearnedToday,
  studyBatchBreakdown,
  directionMode,
  onChangeDirection,
  onChangeTodayNewLimit,
  onUpdateSettings,
  onStartStudy,
  onOpenSimulator,
  onEditDeck,
  onDeleteDeck,
}) => {
  const baseDailyNew = settings.dailyNewLimit ?? 20;

  const todayPresets = useMemo(() => {
    const set = new Set<number>([5, 10, 20, baseDailyNew]);
    return Array.from(set).sort((a, b) => a - b);
  }, [baseDailyNew]);

  const progressPercent = Math.round((stats.activeCount / Math.max(1, stats.total)) * 100);
  const plannedCount = studyBatchBreakdown.reviews + studyBatchBreakdown.news;
  const startLabel =
    stats.total === 0
      ? 'Начать'
      : studyBatchBreakdown.isPractice
        ? `Начать (${plannedCount})`
        : settings.sessionDurationMinutes && settings.sessionDurationMinutes > 0
          ? `Начать (${settings.sessionDurationMinutes} мин)`
          : `Начать (${plannedCount})`;

  const summaryText =
    stats.total === 0
      ? 'Добавьте первые слова в колоду'
      : studyBatchBreakdown.isPractice
        ? 'На сегодня всё закрыто · тренировка слабых мест'
        : studyBatchBreakdown.quotaReached && studyBatchBreakdown.reviews > 0
          ? `План новых (${effectiveDailyNew}) выполнен · к повторению: ${studyBatchBreakdown.reviews}`
          : studyBatchBreakdown.news > 0 && studyBatchBreakdown.reviews > 0
            ? `${studyBatchBreakdown.reviews} на повтор · ${studyBatchBreakdown.news} новых`
            : studyBatchBreakdown.reviews > 0
              ? `К повторению: ${studyBatchBreakdown.reviews} карточек`
              : `Новых в сессии: ${studyBatchBreakdown.news} (осталось на сегодня: ${studyBatchBreakdown.remainingNewToday})`;

  return (
    <section className="p-4 sm:p-6 rounded-2xl bg-[#111216] border border-white/[0.08] space-y-4">
      {/* Row 1: Deck Title & Quick Actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-lg sm:text-xl font-semibold text-zinc-100 truncate">
              {deck.name}
            </h1>
            {onEditDeck && (
              <button
                type="button"
                onClick={() => onEditDeck(deck)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                title="Переименовать колоду"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {onDeleteDeck && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Удалить колоду «${deck.name}» со всеми карточками?`)) {
                    onDeleteDeck(deck.id);
                  }
                }}
                className="p-1.5 rounded-lg text-zinc-600 hover:text-rose-400 hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                title="Удалить колоду"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {deck.description && (
            <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{deck.description}</p>
          )}
        </div>

        <span className="text-xs font-mono tabular-nums text-zinc-400 shrink-0 pt-1">
          {stats.total} карт.
        </span>
      </div>

      {/* Row 2: Today's Flexible New-Card Override («В настройках 20, сегодня в падлу — поставил 5») */}
      {stats.newCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <div className="flex items-center gap-2 text-zinc-400">
            <span>Новых на сегодня:</span>
            <strong className="text-zinc-100 font-mono tabular-nums">
              {effectiveDailyNew}
            </strong>
            {newLearnedToday > 0 && (
              <span className="text-[11px] font-mono text-zinc-500">
                (пройдено {newLearnedToday})
              </span>
            )}
            {dailyNewOverride !== null && (
              <button
                type="button"
                onClick={() => onChangeTodayNewLimit(null)}
                className="text-[11px] font-mono text-zinc-400 hover:text-zinc-200 underline decoration-zinc-700 cursor-pointer"
                title={`Вернуть базовый лимит (${baseDailyNew} в день)`}
              >
                база: {baseDailyNew}
              </button>
            )}
          </div>

          <div
            className="flex items-center gap-1 bg-zinc-950 border border-white/[0.08] p-1 rounded-xl"
            role="group"
            aria-label="Лимит новых слов только на сегодня"
          >
            {todayPresets.map((num) => {
              const active = effectiveDailyNew === num;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => onChangeTodayNewLimit(num === baseDailyNew ? null : num)}
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-mono tabular-nums transition-colors cursor-pointer ${
                    active
                      ? 'bg-zinc-800 text-zinc-100 font-semibold border border-white/15'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title={
                    num === baseDailyNew
                      ? `Базовая норма из настроек (${baseDailyNew})`
                      : `Сделать только на сегодня ${num} новых (завтра вернётся ${baseDailyNew})`
                  }
                >
                  {num}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Row 3: Direct Executive Start Button */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => {
            if (stats.dueCount === 0 && stats.newCount === 0) {
              onStartStudy(deck.id, directionMode, 20);
            } else {
              onStartStudy(deck.id, directionMode, settings.sessionLimit ?? 20);
            }
          }}
          className="w-full py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-[0.99] text-zinc-100 border border-white/15 hover:border-white/25 font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
        >
          <Play className="w-4 h-4 fill-current text-zinc-200" />
          <span>{startLabel}</span>
        </button>

        <p className="text-xs font-mono text-zinc-400 text-center tabular-nums">
          {summaryText}
        </p>
      </div>

      {/* Row 4: Compact Direction & Batch Controls */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1 bg-zinc-950 border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-zinc-400 min-w-0">
          <span className="text-[11px] text-zinc-500 shrink-0 hidden sm:inline">Режим:</span>
          <select
            aria-label="Режим направления"
            value={directionMode}
            onChange={(e) => onChangeDirection(e.target.value as DirectionMode)}
            className="bg-transparent border-none text-zinc-200 text-xs focus:outline-none cursor-pointer w-full min-w-0 truncate"
          >
            <option value="adaptive" className="bg-zinc-900">Адаптивный</option>
            <option value="random" className="bg-zinc-900">50 / 50</option>
            <option value="ru_en" className="bg-zinc-900">RU → EN</option>
            <option value="en_ru" className="bg-zinc-900">EN → RU</option>
          </select>
        </div>

        <div className="flex items-center gap-1 bg-zinc-950 border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-zinc-400 min-w-0">
          <span className="text-[11px] text-zinc-500 shrink-0 hidden sm:inline">Порция:</span>
          <select
            aria-label="Размер порции"
            value={
              settings.sessionDurationMinutes && settings.sessionDurationMinutes > 0
                ? `time_${settings.sessionDurationMinutes}`
                : (settings.sessionLimit ?? 20)
            }
            onChange={(e) => {
              const val = e.target.value;
              if (val.startsWith('time_')) {
                const minutes = Number(val.replace('time_', ''));
                onUpdateSettings({
                  ...settings,
                  sessionDurationMinutes: minutes,
                  sessionLimit: Math.round(minutes * 2.5),
                });
              } else {
                onUpdateSettings({
                  ...settings,
                  sessionDurationMinutes: 0,
                  sessionLimit: Number(val),
                });
              }
            }}
            className="bg-transparent border-none text-zinc-200 text-xs focus:outline-none cursor-pointer w-full min-w-0 truncate font-mono"
          >
            <optgroup label="По времени:">
              <option value="time_5" className="bg-zinc-900">5 мин (~12)</option>
              <option value="time_10" className="bg-zinc-900">10 мин (~25)</option>
              <option value="time_15" className="bg-zinc-900">15 мин (~35)</option>
              <option value="time_20" className="bg-zinc-900">20 мин (~50)</option>
            </optgroup>
            <optgroup label="По количеству:">
              <option value={5} className="bg-zinc-900">5 карт</option>
              <option value={10} className="bg-zinc-900">10 карт</option>
              <option value={20} className="bg-zinc-900">20 карт</option>
              <option value={30} className="bg-zinc-900">30 карт</option>
              <option value={50} className="bg-zinc-900">50 карт</option>
              <option value={0} className="bg-zinc-900">Без лимита</option>
            </optgroup>
          </select>
        </div>
      </div>

      {/* Row 5: Quiet Mastery Bar + Pace Forecast */}
      <div className="pt-2 border-t border-white/[0.06] space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400 tabular-nums">
            Освоено: <strong className="text-zinc-200 font-mono">{stats.activeCount} / {stats.total}</strong> ({progressPercent}%)
          </span>
          <button
            type="button"
            onClick={onOpenSimulator}
            className="text-[11px] text-zinc-400 hover:text-zinc-200 underline decoration-zinc-700 cursor-pointer"
          >
            Прогноз темпа
          </button>
        </div>

        <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden">
          <div
            className="h-full bg-zinc-300 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </section>
  );
};
