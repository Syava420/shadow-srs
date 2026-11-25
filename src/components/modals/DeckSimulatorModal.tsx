'use client';

import React, { useState, useMemo } from 'react';
import { Target, Calendar, Clock, X, Check, TrendingUp } from 'lucide-react';
import { getLocalDateString } from '@/lib/date-utils';
import { ModalDialog } from './ModalDialog';

interface DeckSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  deckName: string;
  totalCards: number;
  dueCardsCount: number;
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
  dueCardsCount,
  newCardsCount,
  activeCardsCount,
  currentDailyGoal = 20,
  onApplyDailyGoal,
}) => {
  const [activeTab, setActiveTab] = useState<'pace' | 'target_date'>('pace');
  const [dailyPace, setDailyPace] = useState<number>(currentDailyGoal > 0 ? currentDailyGoal : 20);
  const defaultTargetDateStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return getLocalDateString(d);
  }, []);
  const [targetDateStr, setTargetDateStr] = useState<string>(defaultTargetDateStr);
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);

  const totalPendingCards = dueCardsCount + newCardsCount;

  const paceCalculations = useMemo(() => {
    if (totalPendingCards === 0) {
      return {
        daysNeeded: 0,
        finishDateStr: 'Колода полностью освоена!',
        minutesPerDay: 0,
        newCardsDays: 0,
      };
    }
    const daysNeeded = Math.ceil(totalPendingCards / Math.max(1, dailyPace));
    const finishDate = new Date();
    finishDate.setDate(finishDate.getDate() + daysNeeded);
    const finishDateFormatted = finishDate.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const newPerDay = Math.max(1, Math.round(dailyPace * 0.3));
    const newCardsDays = newCardsCount > 0 ? Math.ceil(newCardsCount / newPerDay) : 0;
    const minutesPerDay = Math.round(dailyPace * 0.4 + 2);
    return { daysNeeded, finishDateStr: finishDateFormatted, minutesPerDay, newCardsDays };
  }, [totalPendingCards, newCardsCount, dailyPace]);

  const dateCalculations = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDateStr);
    target.setHours(0, 0, 0, 0);

    const diffMs = target.getTime() - today.getTime();
    const daysAvailable = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    if (totalPendingCards === 0) {
      return { daysAvailable, requiredPace: 0, text: 'Колода уже освоена!' };
    }
    const requiredPace = Math.ceil(totalPendingCards / daysAvailable);
    const text =
      requiredPace > 40
        ? 'Высокая нагрузка (~25–35 мин в день)'
        : requiredPace > 20
          ? 'Умеренный темп (~15–20 мин в день)'
          : 'Комфортный темп (~8–12 мин в день)';
    return { daysAvailable, requiredPace, text };
  }, [targetDateStr, totalPendingCards]);

  const percentLearned = totalCards > 0 ? Math.round((activeCardsCount / totalCards) * 100) : 0;

  const handleApply = (goalToApply: number) => {
    if (onApplyDailyGoal) {
      onApplyDailyGoal(goalToApply);
      setAppliedNotice(`Цель обновлена: ${goalToApply} карт/день`);
      setTimeout(() => setAppliedNotice(null), 2500);
    }
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledBy="simulator-title"
      className="w-[calc(100%-1.5rem)] max-w-lg bg-[#111216] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl text-zinc-100"
    >
      <div className="space-y-4 max-h-[82dvh] overflow-y-auto pr-1">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div>
            <h2 id="simulator-title" className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Target className="w-4 h-4 text-zinc-400" />
              <span>Прогноз темпа</span>
            </h2>
            <p className="text-xs text-zinc-400 truncate max-w-xs">{deckName}</p>
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

        {/* Summary Grid */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-xl bg-zinc-950 border border-white/[0.06]">
            <div className="text-[11px] text-zinc-500">Повтор</div>
            <div className="font-mono font-semibold text-amber-300 text-sm tabular-nums">{dueCardsCount}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-950 border border-white/[0.06]">
            <div className="text-[11px] text-zinc-500">Новых</div>
            <div className="font-mono font-semibold text-zinc-200 text-sm tabular-nums">{newCardsCount}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-950 border border-white/[0.06]">
            <div className="text-[11px] text-zinc-500">В активе</div>
            <div className="font-mono font-semibold text-emerald-400 text-sm tabular-nums">{percentLearned}%</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-950 border border-white/[0.08] text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('pace')}
            className={`py-1.5 px-3 rounded-lg font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'pace' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>По темпу</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('target_date')}
            className={`py-1.5 px-3 rounded-lg font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'target_date' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>К дате</span>
          </button>
        </div>

        {activeTab === 'pace' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300">Карточек в день:</span>
              <span className="font-mono font-bold text-zinc-100">{dailyPace}</span>
            </div>
            <input
              type="range"
              min={5}
              max={60}
              step={5}
              value={dailyPace}
              onChange={(e) => setDailyPace(Number(e.target.value))}
              className="w-full accent-zinc-300 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
            />
            <div className="p-4 rounded-xl bg-zinc-950 border border-white/[0.06] space-y-2 text-xs">
              <div className="text-zinc-200 font-semibold">
                Финиш через {paceCalculations.daysNeeded} дн. ({paceCalculations.finishDateStr})
              </div>
              <div className="text-zinc-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                <span>~{paceCalculations.minutesPerDay} мин/день</span>
              </div>
              {onApplyDailyGoal && (
                <button
                  type="button"
                  onClick={() => handleApply(dailyPace)}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-white/15 font-medium cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Применить {dailyPace} / день</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="date"
              value={targetDateStr}
              min={getLocalDateString()}
              onChange={(e) => setTargetDateStr(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/[0.08] text-zinc-200 text-xs font-mono cursor-pointer"
            />
            <div className="p-4 rounded-xl bg-zinc-950 border border-white/[0.06] space-y-2 text-xs">
              <div className="text-zinc-200 font-semibold">
                Нужно по {dateCalculations.requiredPace} карт/день ({dateCalculations.daysAvailable} дн.)
              </div>
              <div className="text-zinc-400">{dateCalculations.text}</div>
              {onApplyDailyGoal && dateCalculations.requiredPace > 0 && (
                <button
                  type="button"
                  onClick={() => handleApply(dateCalculations.requiredPace)}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-white/15 font-medium cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Применить темп ({dateCalculations.requiredPace}/день)</span>
                </button>
              )}
            </div>
          </div>
        )}

        {appliedNotice && (
          <div className="p-2 rounded-xl bg-zinc-900 border border-emerald-500/30 text-emerald-300 text-xs text-center">
            {appliedNotice}
          </div>
        )}
      </div>
    </ModalDialog>
  );
};
