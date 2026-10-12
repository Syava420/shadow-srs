'use client';

import React, { useState, useMemo } from 'react';
import { Target, Calendar, Clock, Sparkles, X, Check, ArrowRight, Zap, TrendingUp } from 'lucide-react';

interface DeckSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  deckName: string;
  totalCards: number;
  newCardsCount: number;
  activeCardsCount: number;
  currentDailyGoal?: number;
  onApplyDailyGoal?: (newDailyGoal: number) => void;
}

export const DeckSimulatorModal: React.FC<DeckSimulatorModalProps> = ({
  isOpen,
  onClose,
  deckName,
  totalCards,
  newCardsCount,
  activeCardsCount,
  currentDailyGoal = 15,
  onApplyDailyGoal,
}) => {
  // Mode: 'pace' (choose daily cards -> see finish date) vs 'target_date' (choose date -> see required daily cards)
  const [activeTab, setActiveTab] = useState<'pace' | 'target_date'>('pace');
  
  // Tab 1 state: cards per day
  const [dailyPace, setDailyPace] = useState<number>(currentDailyGoal > 0 ? currentDailyGoal : 15);
  
  // Tab 2 state: target date (default ~30 days from now)
  const defaultTargetDateStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  }, []);
  const [targetDateStr, setTargetDateStr] = useState<string>(defaultTargetDateStr);

  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);

  // Tab 1 Calculations: Daily Pace -> Target Date
  const paceCalculations = useMemo(() => {
    if (newCardsCount === 0) {
      return { daysNeeded: 0, finishDateStr: 'Колода уже полностью освоена!', minutesPerDay: 5 };
    }
    const daysNeeded = Math.ceil(newCardsCount / Math.max(1, dailyPace));
    const finishDate = new Date();
    finishDate.setDate(finishDate.getDate() + daysNeeded);
    const finishDateFormatted = finishDate.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    // Rough estimate: ~25s per review + 35s per new card
    const minutesPerDay = Math.round((dailyPace * 0.6) + 4);
    return {
      daysNeeded,
      finishDateStr: finishDateFormatted,
      minutesPerDay,
    };
  }, [newCardsCount, dailyPace]);

  // Tab 2 Calculations: Target Date -> Required Daily Cards
  const dateCalculations = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDateStr);
    target.setHours(0, 0, 0, 0);

    const diffMs = target.getTime() - today.getTime();
    const daysAvailable = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));

    if (newCardsCount === 0) {
      return { daysAvailable, requiredPace: 0, status: 'easy', text: 'Колода уже освоена!' };
    }

    const requiredPace = Math.ceil(newCardsCount / daysAvailable);
    let status: 'easy' | 'moderate' | 'hard' = 'easy';
    let text = 'Комфортный темп (~8–10 мин в день)';

    if (requiredPace > 30) {
      status = 'hard';
      text = 'Высокая нагрузка (~30+ мин в день), лучше заложить больше дней';
    } else if (requiredPace > 15) {
      status = 'moderate';
      text = 'Умеренный темп (~15–20 мин в день)';
    }

    return {
      daysAvailable,
      requiredPace,
      status,
      text,
    };
  }, [targetDateStr, newCardsCount]);

  if (!isOpen) return null;

  const percentLearned = totalCards > 0 ? Math.round((activeCardsCount / totalCards) * 100) : 0;

  const handleApply = (goalToApply: number) => {
    if (onApplyDailyGoal) {
      onApplyDailyGoal(goalToApply);
      setAppliedNotice(`Цель обновлена: ${goalToApply} новых слов в день!`);
      setTimeout(() => setAppliedNotice(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-lg bg-[#121215] border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                Симулятор обучения & Прогноз
              </h3>
              <p className="text-xs text-zinc-400 truncate max-w-xs sm:max-w-md">
                Колода «{deckName}»
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

        {/* Current Deck Progress Overview */}
        <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800/70">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-zinc-400">Текущий прогресс колоды</span>
            <span className="font-mono font-bold text-emerald-400">{percentLearned}% освоено</span>
          </div>
          <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              style={{ width: `${percentLearned}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/50">
              <div className="text-[10px] text-zinc-500">В активе</div>
              <div className="font-mono font-semibold text-zinc-200">{activeCardsCount}</div>
            </div>
            <div className="p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/50">
              <div className="text-[10px] text-zinc-500">Осталось новых</div>
              <div className="font-mono font-semibold text-blue-400">{newCardsCount}</div>
            </div>
            <div className="p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/50">
              <div className="text-[10px] text-zinc-500">Всего в колоде</div>
              <div className="font-mono font-semibold text-zinc-400">{totalCards}</div>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
          <button
            onClick={() => setActiveTab('pace')}
            className={`py-2 px-3 rounded-lg font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'pace'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Задать темп (слов в день)</span>
          </button>
          <button
            onClick={() => setActiveTab('target_date')}
            className={`py-2 px-3 rounded-lg font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'target_date'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Цель к дате (хочу к...)</span>
          </button>
        </div>

        {/* Tab 1: Set Daily Pace */}
        {activeTab === 'pace' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-zinc-300 font-medium">Новых слов в день:</span>
                <span className="font-mono text-base font-bold text-emerald-400">{dailyPace} шт.</span>
              </div>
              <input
                type="range"
                min={1}
                max={50}
                value={dailyPace}
                onChange={(e) => setDailyPace(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer h-2 bg-zinc-800 rounded-lg"
              />
              <div className="flex items-center justify-between gap-1.5 mt-2">
                {[5, 10, 15, 20, 30].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setDailyPace(preset)}
                    className={`flex-1 py-1 rounded-lg text-xs font-mono font-medium transition-colors border cursor-pointer ${
                      dailyPace === preset
                        ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Calculated Result Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/30 to-zinc-900/80 border border-emerald-900/40 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="text-xs text-zinc-400">При темпе {dailyPace} новых слов в день:</div>
                  <div className="text-sm font-semibold text-zinc-100">
                    Колода будет полностью освоена через{' '}
                    <span className="text-emerald-300 font-bold font-mono">{paceCalculations.daysNeeded} дн.</span>
                  </div>
                  <div className="text-xs text-emerald-400 font-medium">
                    Ориентировочная дата финиша: {paceCalculations.finishDateStr}
                  </div>
                  <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    <span>Примерно ~{paceCalculations.minutesPerDay} минут занятий в день</span>
                  </div>
                </div>
              </div>

              {onApplyDailyGoal && (
                <button
                  onClick={() => handleApply(dailyPace)}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white text-xs font-semibold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Сохранить {dailyPace} слов/день как цель</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Target Date */}
        {activeTab === 'target_date' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-2">
                К какому числу нужно полностью освоить колоду?
              </label>
              <input
                type="date"
                value={targetDateStr}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setTargetDateStr(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs focus:border-emerald-500 outline-none font-mono cursor-pointer"
              />
              <div className="flex items-center gap-2 mt-2">
                {[
                  { label: 'Через 2 недели', days: 14 },
                  { label: 'Через 1 месяц', days: 30 },
                  { label: 'Через 2 месяца', days: 60 },
                ].map((item) => (
                  <button
                    key={item.days}
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + item.days);
                      setTargetDateStr(d.toISOString().split('T')[0]);
                    }}
                    className="flex-1 py-1 px-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer truncate"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Calculated Result Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/30 to-zinc-900/80 border border-blue-900/40 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <Target className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="text-xs text-zinc-400">
                    До дедлайна осталось: <span className="text-zinc-200 font-mono font-semibold">{dateCalculations.daysAvailable} дн.</span>
                  </div>
                  <div className="text-sm font-semibold text-zinc-100">
                    Вам необходимо учить по{' '}
                    <span className="text-blue-300 font-bold font-mono text-base">{dateCalculations.requiredPace}</span> новых слов в день
                  </div>
                  <div className="text-xs text-zinc-300 flex items-center gap-1.5 mt-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>{dateCalculations.text}</span>
                  </div>
                </div>
              </div>

              {onApplyDailyGoal && (
                <button
                  onClick={() => handleApply(dateCalculations.requiredPace)}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-98 text-white text-xs font-semibold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Применить этот темп ({dateCalculations.requiredPace} слов/день)</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Notice of applied goal */}
        {appliedNotice && (
          <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs text-center font-medium animate-fadeIn">
            {appliedNotice}
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-zinc-800/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
