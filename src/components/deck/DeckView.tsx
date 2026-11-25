'use client';

import React, { useState, useMemo } from 'react';
import { Deck, FlashCard, DirectionMode, AppSettings } from '@/types';
import { calculateDeckStats } from '@/lib/fsrs';
import { getLocalDateString } from '@/lib/date-utils';
import { Plus, Search, Layers, ArrowUpDown } from 'lucide-react';
import { DeckSimulatorModal } from '@/components/modals/DeckSimulatorModal';
import { DeckCardItem } from './DeckCardItem';
import { DeckStartHub } from './DeckStartHub';
import {
  computeStudyBatchComposition,
  filterAndSortCards,
  SortOption,
  FilterOption,
} from './deck-helpers';

interface DeckViewProps {
  deck: Deck;
  cards: FlashCard[];
  settings: AppSettings;
  effectiveDailyNew: number;
  dailyNewOverride: number | null;
  onChangeTodayNewLimit: (limit: number | null) => void;
  onUpdateSettings: (settings: AppSettings) => void;
  onStartStudy: (deckId: string, directionMode?: DirectionMode, cardLimit?: number) => void;
  onOpenAddWords: () => void;
  onEditCard: (card: FlashCard) => void;
  onDeleteCard: (cardId: string) => void;
  onEditDeck?: (deck: Deck) => void;
  onDeleteDeck?: (deckId: string) => void;
}

export const DeckView: React.FC<DeckViewProps> = ({
  deck,
  cards,
  settings,
  effectiveDailyNew,
  dailyNewOverride,
  onChangeTodayNewLimit,
  onUpdateSettings,
  onStartStudy,
  onOpenAddWords,
  onEditCard,
  onDeleteCard,
  onEditDeck,
  onDeleteDeck,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('due_first');
  const [filterMode, setFilterMode] = useState<FilterOption>('all');
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);
  const [directionMode, setDirectionMode] = useState<DirectionMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('shadow_srs_direction_mode') as DirectionMode) || 'adaptive';
    }
    return 'adaptive';
  });

  const handleDirectionChange = (mode: DirectionMode) => {
    setDirectionMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('shadow_srs_direction_mode', mode);
    }
  };

  const deckCards = useMemo(() => cards.filter((c) => c.deckId === deck.id), [cards, deck.id]);
  const stats = useMemo(() => calculateDeckStats(deckCards), [deckCards]);

  const todayStr = useMemo(() => getLocalDateString(), []);
  const newLearnedToday = useMemo(() => {
    return deckCards.filter(
      (c) =>
        c.fsrsCard?.reps === 1 &&
        c.lastStudiedAt &&
        getLocalDateString(new Date(c.lastStudiedAt)) === todayStr
    ).length;
  }, [deckCards, todayStr]);

  const remainingNewToday = Math.max(0, effectiveDailyNew - newLearnedToday);
  const dailyReviewLimit = settings.dailyReviewLimit ?? 100;

  const studyBatchBreakdown = useMemo(() => {
    return computeStudyBatchComposition(deckCards, stats, settings, remainingNewToday, dailyReviewLimit);
  }, [deckCards, stats, settings, remainingNewToday, dailyReviewLimit]);

  const processedCards = useMemo(() => {
    return filterAndSortCards(deckCards, searchQuery, filterMode, sortBy);
  }, [deckCards, searchQuery, filterMode, sortBy]);

  const displayedCards = useMemo(() => {
    return processedCards.slice(0, visibleCount);
  }, [processedCards, visibleCount]);

  const handleFilterChange = (next: FilterOption) => {
    setFilterMode(next);
    setVisibleCount(50);
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setVisibleCount(50);
  };

  const handleSortChange = (next: SortOption) => {
    setSortBy(next);
    setVisibleCount(50);
  };

  const filterTabs: { id: FilterOption; label: string; count: number }[] = [
    { id: 'all', label: 'Все', count: deckCards.length },
    { id: 'due', label: 'Повтор', count: stats.dueCount },
    { id: 'new', label: 'Новые', count: stats.newCount },
    { id: 'difficult', label: 'Трудные', count: stats.difficultCount },
  ];

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto p-3 sm:p-6 space-y-5">
      {/* 1. Compact Start Hub */}
      <DeckStartHub
        deck={deck}
        stats={stats}
        settings={settings}
        effectiveDailyNew={effectiveDailyNew}
        dailyNewOverride={dailyNewOverride}
        newLearnedToday={newLearnedToday}
        studyBatchBreakdown={studyBatchBreakdown}
        directionMode={directionMode}
        onChangeDirection={handleDirectionChange}
        onChangeTodayNewLimit={onChangeTodayNewLimit}
        onUpdateSettings={onUpdateSettings}
        onStartStudy={onStartStudy}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        onEditDeck={onEditDeck}
        onDeleteDeck={onDeleteDeck}
      />

      {/* 2. Filter Tabs + Search + Sort */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Queue Filter Pills */}
          <div className="flex items-center gap-1 bg-zinc-950 border border-white/[0.08] rounded-xl p-1 overflow-x-auto">
            {filterTabs.map((tab) => {
              if (tab.id !== 'all' && tab.count === 0 && filterMode !== tab.id) return null;
              const active = filterMode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleFilterChange(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    active
                      ? 'bg-zinc-800 text-zinc-100 border border-white/10'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="font-mono text-[11px] text-zinc-500 tabular-nums">
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 sm:w-52">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full bg-zinc-950 border border-white/[0.08] focus:border-zinc-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1 bg-zinc-950 border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-xs text-zinc-300 shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as SortOption)}
                className="bg-transparent border-none text-xs text-zinc-200 focus:outline-none cursor-pointer pr-1"
              >
                <option value="due_first" className="bg-zinc-900">Сначала повтор</option>
                <option value="difficult_first" className="bg-zinc-900">Трудные</option>
                <option value="mastery_asc" className="bg-zinc-900">Меньше %</option>
                <option value="mastery_desc" className="bg-zinc-900">Больше %</option>
                <option value="newest" className="bg-zinc-900">Сначала новые</option>
                <option value="alphabetical" className="bg-zinc-900">A–Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. Cards List / Empty State */}
        {processedCards.length === 0 ? (
          <div className="p-10 text-center rounded-2xl bg-[#111216] border border-white/[0.06] flex flex-col items-center justify-center space-y-2.5">
            <Layers className="w-7 h-7 text-zinc-600" />
            <p className="text-sm text-zinc-300 font-medium">
              {searchQuery ? 'Ничего не найдено' : 'В этом списке пока пусто'}
            </p>
            <p className="text-xs text-zinc-500 max-w-sm">
              {filterMode === 'difficult'
                ? 'Трудных карточек с частыми ошибками нет.'
                : 'Добавьте одно слово или вставьте сразу список из нейросети.'}
            </p>
            {!searchQuery && filterMode === 'all' && (
              <button
                type="button"
                onClick={onOpenAddWords}
                className="mt-1 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-white/10 text-xs font-medium transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Добавить слова</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {displayedCards.map((card) => (
              <DeckCardItem
                key={card.id}
                card={card}
                settings={settings}
                onEdit={onEditCard}
                onDelete={onDeleteCard}
              />
            ))}

            {visibleCount < processedCards.length && (
              <div className="pt-3 pb-6 flex flex-col items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + 50)}
                  className="px-4 py-2 rounded-xl bg-[#111216] hover:bg-zinc-800 border border-white/[0.08] text-zinc-300 hover:text-zinc-100 text-xs font-medium transition-colors cursor-pointer"
                >
                  Показать ещё 50 ({displayedCards.length} из {processedCards.length})
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleCount(processedCards.length)}
                  className="text-[11px] text-zinc-500 hover:text-zinc-300 underline transition-colors cursor-pointer"
                >
                  Показать все ({processedCards.length})
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Deck Simulator Modal */}
      <DeckSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        deckName={deck.name}
        totalCards={stats.total}
        dueCardsCount={stats.dueCount}
        newCardsCount={stats.newCount}
        activeCardsCount={stats.activeCount}
        currentDailyGoal={effectiveDailyNew}
        onApplyDailyGoal={(newGoal) => {
          onUpdateSettings({ ...settings, dailyGoal: newGoal, dailyNewLimit: newGoal });
        }}
      />
    </div>
  );
};
