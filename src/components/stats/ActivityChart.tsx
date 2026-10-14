'use client';

import React, { useState, useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { DailyActivity } from '@/types';

type TimeRange = '7' | '14' | '30';

interface ActivityChartProps {
  dailyHistory: Record<string, DailyActivity>;
  formatTime: (totalSeconds: number) => string;
}

function getShortWeekday(d: Date): string {
  const s = d.toLocaleDateString('ru-RU', { weekday: 'short' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const ActivityChart: React.FC<ActivityChartProps> = ({
  dailyHistory,
  formatTime,
}) => {
  const [range, setRange] = useState<TimeRange>('14');
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const daysCount = parseInt(range, 10);
  const daysList = useMemo(() => {
    const list: {
      dateStr: string;
      dayNum: number;
      weekday: string;
      fullLabel: string;
      count: number;
      seconds: number;
      winrate: number | null;
      isToday: boolean;
    }[] = [];

    const today = new Date();
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayData = dailyHistory[dateStr] || { cardsReviewed: 0, activeSeconds: 0 };

      const remembered = dayData.rememberedCount;
      const winrate = dayData.cardsReviewed > 0 && remembered !== undefined
        ? Math.round((remembered / dayData.cardsReviewed) * 100)
        : null;

      list.push({
        dateStr,
        dayNum: d.getDate(),
        weekday: getShortWeekday(d),
        fullLabel: d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }),
        count: dayData.cardsReviewed,
        seconds: dayData.activeSeconds,
        winrate,
        isToday: dateStr === todayStr,
      });
    }
    return list;
  }, [daysCount, dailyHistory, todayStr]);

  const maxCardsInRange = Math.max(1, ...daysList.map(d => d.count));
  const activeSelected = daysList.find(d => d.dateStr === selectedDate) || daysList[daysList.length - 1];

  let rangeCardsCount = 0;
  let rangeSecondsCount = 0;
  daysList.forEach(d => {
    rangeCardsCount += d.count;
    rangeSecondsCount += d.seconds;
  });

  return (
    <div className="p-4 rounded-2xl bg-[#09090b] border border-zinc-800/80 space-y-3">
      {/* Top Header & Range Switcher */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-zinc-200">
          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
          <span>Динамика активности</span>
        </div>

        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-0.5">
          {(['7', '14', '30'] as TimeRange[]).map((r) => (
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
              {r} дн
            </button>
          ))}
        </div>
      </div>

      {/* Period summary */}
      <div className="text-[11px] text-zinc-500 flex items-center justify-between font-mono">
        <span>Повторено: <strong className="text-zinc-200">{rangeCardsCount}</strong> карт</span>
        <span>Чистое время: <strong className="text-zinc-200">{formatTime(rangeSecondsCount)}</strong></span>
      </div>

      {/* VIEW A: BAR CHART (7 or 14 days) */}
      {range !== '30' ? (
        <div className="pt-2">
          <div className="h-32 flex items-end gap-1.5 sm:gap-2 px-1">
            {daysList.map((day) => {
              const heightPercent = day.count > 0
                ? Math.max(14, Math.round((day.count / maxCardsInRange) * 100))
                : 4;
              const isSelected = day.dateStr === selectedDate;

              return (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() => setSelectedDate(day.dateStr)}
                  className="flex-1 h-full flex flex-col items-center justify-end group cursor-pointer focus:outline-none"
                >
                  {/* Card count label above bar */}
                  <span className={`text-[10px] font-mono mb-1 transition-opacity ${
                    day.count > 0
                      ? isSelected ? 'text-zinc-100 font-bold' : 'text-zinc-400 group-hover:text-zinc-200'
                      : 'text-transparent'
                  }`}>
                    {day.count}
                  </span>

                  {/* Vertical bar slot */}
                  <div className="w-full bg-zinc-850/80 rounded-md p-0.5 flex flex-col justify-end h-20">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-sm transition-all duration-300 ${
                        isSelected
                          ? 'bg-zinc-100 ring-2 ring-zinc-400/40'
                          : day.isToday
                          ? 'bg-zinc-300 group-hover:bg-zinc-200'
                          : day.count > 0
                          ? 'bg-zinc-600 group-hover:bg-zinc-500'
                          : 'bg-zinc-800/40'
                      }`}
                    />
                  </div>

                  {/* Day labels */}
                  <div className="mt-1.5 text-center leading-none">
                    <div className={`text-[9px] font-mono ${
                      day.isToday ? 'text-zinc-200 font-bold' : 'text-zinc-500'
                    }`}>
                      {day.weekday}
                    </div>
                    <div className={`text-[10px] font-mono mt-0.5 ${
                      day.isToday ? 'text-zinc-100 font-bold' : isSelected ? 'text-zinc-300' : 'text-zinc-400'
                    }`}>
                      {day.dayNum}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* VIEW B: 30-DAY HEATMAP MATRIX */
        <div className="pt-2">
          <div className="grid grid-cols-10 gap-1.5">
            {daysList.map((day) => {
              const isSelected = day.dateStr === selectedDate;
              const intensityClass = day.count === 0
                ? 'bg-zinc-900 border-zinc-800/80 text-zinc-600'
                : day.count < 10
                ? 'bg-zinc-700 border-zinc-600 text-zinc-200'
                : day.count < 25
                ? 'bg-zinc-500 border-zinc-400 text-zinc-100'
                : 'bg-zinc-200 border-zinc-100 text-zinc-950 font-bold';

              return (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() => setSelectedDate(day.dateStr)}
                  className={`aspect-square rounded-xl border flex flex-col items-center justify-center p-1 transition-all cursor-pointer ${intensityClass} ${
                    isSelected ? 'ring-2 ring-zinc-100 ring-offset-2 ring-offset-zinc-950 scale-105 z-10' : ''
                  } ${day.isToday ? 'outline outline-1 outline-zinc-400' : ''}`}
                >
                  <span className="text-[10px] font-mono">{day.dayNum}</span>
                  {day.count > 0 && (
                    <span className="text-[8px] font-mono leading-none opacity-80">{day.count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected day inspector pill */}
      {activeSelected && (
        <div className="mt-2 p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-300 font-medium">{activeSelected.fullLabel}</span>
            {activeSelected.isToday && (
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-zinc-800 text-zinc-300 font-mono">
                сегодня
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5 font-mono text-[11px]">
            <span className="text-zinc-200">
              <strong>{activeSelected.count}</strong> карт
            </span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-400">{formatTime(activeSelected.seconds)}</span>
            {activeSelected.winrate !== null && (
              <>
                <span className="text-zinc-600">·</span>
                <span className="text-emerald-400 font-semibold">{activeSelected.winrate}% точность</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
