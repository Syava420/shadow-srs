'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Deck, FlashCard, DirectionMode, AppSettings } from '@/types';
import { calculateDeckStats } from '@/lib/fsrs';
import { 
  Play, Plus, Search, Layers, ArrowUpDown,
  AlertCircle
} from 'lucide-react';
import { DeckSimulatorModal } from '@/components/modals/DeckSimulatorModal';
import { DeckCardItem } from './DeckCardItem';
import { getLocalDateString } from '@/lib/date-utils';
import { 
  computeStudyBatchComposition, 
  filterAndSortCards, 
  SortOption, 
  FilterOption 
} from './deck-helpers';

interface DeckViewProps {
  deck: Deck;
  cards: FlashCard[];
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onStartStudy: (deckId: string, directionMode?: DirectionMode, cardLimit?: number) => void;
  onOpenImport: () => void;
  onAddCard: (deckId: string) => void;
  onEditCard: (card: FlashCard) => void;
  onDeleteCard: (cardId: string) => void;
  onEditDeck?: (deck: Deck) => void;
  onDeleteDeck?: (deckId: string) => void;
}

export const DeckView: React.FC<DeckViewProps> = ({
  deck,
  cards,
  settings,
  onUpdateSettings,
  onStartStudy,
  onOpenImport,
  onAddCard,
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

  const deckCards = useMemo(() => cards.filter(c => c.deckId === deck.id), [cards, deck.id]);
  const stats = useMemo(() => calculateDeckStats(deckCards), [deckCards]);

  const todayStr = useMemo(() => getLocalDateString(), []);
  const newLearnedToday = useMemo(() => {
    return deckCards.filter(c => 
      c.fsrsCard?.reps === 1 && 
      c.lastStudiedAt && 
      getLocalDateString(new Date(c.lastStudiedAt)) === todayStr
    ).length;
  }, [deckCards, todayStr]);

  const dailyNewLimit = settings.dailyNewLimit ?? 20;
  const remainingNewToday = Math.max(0, dailyNewLimit - newLearnedToday);
  const dailyReviewLimit = settings.dailyReviewLimit ?? 100;

  // Calculate upcoming study session batch composition
  const studyBatchBreakdown = useMemo(() => {
    return computeStudyBatchComposition(deckCards, stats, settings, remainingNewToday, dailyReviewLimit);
  }, [deckCards, stats, settings, remainingNewToday, dailyReviewLimit]);

  // Filter and sort cards
  const processedCards = useMemo(() => {
    return filterAndSortCards(deckCards, searchQuery, filterMode, sortBy);
  }, [deckCards, searchQuery, filterMode, sortBy]);

  // Reset pagination when deck or filter criteria change
  useEffect(() => {
    setVisibleCount(50);
  }, [deck.id, searchQuery, filterMode, sortBy]);

  const displayedCards = useMemo(() => {
    return processedCards.slice(0, visibleCount);
  }, [processedCards, visibleCount]);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto bg-[#09090b] p-4 md:p-6 select-none">
      {/* Top Banner / Deck Overview - Clean & Ergonomic */}
      <div className="p-5 md:p-6 rounded-2xl bg-[#121215] border border-zinc-800/80 mb-5 shadow-sm">
        {/* Row 1: Deck Title + Quick Actions */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-zinc-100">{deck.name}</h2>
              {onEditDeck && (
                <button
                  onClick={() => onEditDeck(deck)}
                  className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/80 transition-colors cursor-pointer"
                  title="Переименовать колоду"
                >
                  <span className="text-xs font-mono text-zinc-400">✎</span>
                </button>
              )}
              {onDeleteDeck && (
                <button
                  onClick={() => {
                    if (confirm(`Удалить колоду «${deck.name}» со всеми карточками?`)) {
                      onDeleteDeck(deck.id);
                    }
                  }}
                  className="p-1 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-zinc-800/80 transition-colors cursor-pointer"
                  title="Удалить колоду"
                >
                  <span className="text-xs font-mono text-zinc-400">⌫</span>
                </button>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {deck.description || `${deckCards.length} карточек в колоде`}
            </p>
          </div>

          <button
            onClick={() => onAddCard(deck.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-800 transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Слово</span>
          </button>
        </div>

        {/* Row 2: Hero Study Action Button */}
        <div className="mt-4">
          <button
            onClick={() => {
              if (stats.dueCount === 0 && stats.newCount === 0) {
                onStartStudy(deck.id, directionMode, 20);
              } else {
                onStartStudy(deck.id, directionMode, settings.sessionLimit || 20);
              }
            }}
            className="w-full py-3 px-4 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-semibold text-sm transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>
              {stats.totalNeedReview > 0
                ? settings.sessionDurationMinutes && settings.sessionDurationMinutes > 0
                  ? `Учить (${settings.sessionDurationMinutes} мин)`
                  : settings.sessionLimit && settings.sessionLimit > 0 && stats.totalNeedReview > settings.sessionLimit
                    ? `Учить (${settings.sessionLimit} из ${stats.totalNeedReview} шт.)`
                    : `Учить (${stats.totalNeedReview} шт.)`
                : 'Повторить колоду'}
            </span>
          </button>
          {deckCards.length > 0 && (
            <div className="text-[11px] font-mono text-zinc-400 mt-2 text-center">
              {studyBatchBreakdown.isPractice
                ? 'Все карточки на сегодня закрыты · Умная тренировка слабых мест'
                : studyBatchBreakdown.quotaReached && studyBatchBreakdown.reviews > 0
                ? `Дневной план новых (${dailyNewLimit}) закрыт · В этой порции: ${studyBatchBreakdown.reviews} на повторение`
                : studyBatchBreakdown.news > 0 && studyBatchBreakdown.reviews > 0
                ? `В этой порции: ${studyBatchBreakdown.reviews} на повторение + ${studyBatchBreakdown.news} новых (осталось в плане: ${studyBatchBreakdown.remainingNewToday})`
                : studyBatchBreakdown.reviews > 0
                ? `В этой порции: ${studyBatchBreakdown.reviews} карточек на повторение`
                : `В этой порции: ${studyBatchBreakdown.news} новых карточек (осталось в плане: ${studyBatchBreakdown.remainingNewToday})`}
            </div>
          )}
        </div>

        {/* Row 3: Compact Settings Strip (Direction & Batch Size) */}
        <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
          {/* Direction selector */}
          <div className="flex items-center gap-1.5 bg-zinc-900/80 border border-zinc-800/80 rounded-xl px-2.5 py-1.5 text-zinc-400">
            <span className="text-[11px] text-zinc-500 shrink-0">Режим:</span>
            <select
              value={directionMode}
              onChange={(e) => handleDirectionChange(e.target.value as DirectionMode)}
              className="bg-transparent border-none text-zinc-200 text-xs focus:outline-none cursor-pointer w-full truncate pr-1"
            >
              <option value="adaptive" className="bg-zinc-900">Адаптивный (En ⇄ Ru)</option>
              <option value="random" className="bg-zinc-900">Случайный (50 / 50)</option>
              <option value="ru_en" className="bg-zinc-900">RU → EN (Говорение)</option>
              <option value="en_ru" className="bg-zinc-900">EN → RU (Аудирование)</option>
            </select>
          </div>

          {/* Batch size selector */}
          <div className="flex items-center gap-1.5 bg-zinc-900/80 border border-zinc-800/80 rounded-xl px-2.5 py-1.5 text-zinc-400">
            <span className="text-[11px] text-zinc-500 shrink-0">Порция:</span>
            <select
              value={
                settings.sessionDurationMinutes && settings.sessionDurationMinutes > 0
                  ? `time_${settings.sessionDurationMinutes}`
                  : (settings.sessionLimit ?? 20)
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val.startsWith('time_')) {
                  const minutes = Number(val.replace('time_', ''));
                  const estimatedCards = Math.round(minutes * 2.5);
                  onUpdateSettings({ 
                    ...settings, 
                    sessionDurationMinutes: minutes,
                    sessionLimit: estimatedCards,
                  });
                } else {
                  const limit = Number(val);
                  onUpdateSettings({ 
                    ...settings, 
                    sessionDurationMinutes: 0,
                    sessionLimit: limit,
                  });
                }
              }}
              className="bg-transparent border-none text-zinc-200 text-xs focus:outline-none cursor-pointer w-full truncate pr-1 font-mono"
            >
              <optgroup label="По времени:">
                <option value="time_5" className="bg-zinc-900">5 минут (~12 карт)</option>
                <option value="time_10" className="bg-zinc-900">10 минут (~25 карт)</option>
                <option value="time_15" className="bg-zinc-900">15 минут (~35 карт)</option>
                <option value="time_20" className="bg-zinc-900">20 минут (~50 карт)</option>
              </optgroup>
              <optgroup label="По количеству:">
                <option value={5} className="bg-zinc-900">5 карточек</option>
                <option value={10} className="bg-zinc-900">10 карточек</option>
                <option value={20} className="bg-zinc-900">20 карточек</option>
                <option value={30} className="bg-zinc-900">30 карточек</option>
                <option value={50} className="bg-zinc-900">50 карточек</option>
                <option value={0} className="bg-zinc-900">Без лимита</option>
              </optgroup>
            </select>
          </div>
        </div>

        {/* Row 4: Clean Progress Card */}
        <div className="mt-4 pt-3.5 border-t border-zinc-800/60">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-zinc-400">
              Освоено: <strong className="text-zinc-200 font-mono">{stats.activeCount} из {stats.total}</strong> ({Math.round((stats.activeCount / Math.max(1, stats.total)) * 100)}%)
            </span>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="text-amber-400">{stats.dueCount} повт.</span>
              <span className="text-zinc-600">·</span>
              <span className="text-blue-400">{stats.newCount} новых</span>
            </div>
          </div>
          <div className="w-full h-1.5 rounded-full bg-zinc-850 overflow-hidden">
            <div
              className="h-full bg-zinc-300 rounded-full transition-all duration-500"
              style={{ width: `${Math.round((stats.activeCount / Math.max(1, stats.total)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Row 5: Subtle Pace Info with Simulator Trigger */}
        <div className="flex items-center justify-between text-xs text-zinc-500 mt-2.5">
          <span className="text-[11px] truncate">
            {stats.dueCount === 0 && stats.newCount === 0
              ? 'Колода чиста! Отдыхайте до завтра.'
              : `Темп ${settings.dailyGoal || 20} карт/день: финиш через ${Math.ceil((stats.dueCount + stats.newCount) / (settings.dailyGoal || 20))} дн.`}
          </span>
          <button
            onClick={() => setIsSimulatorOpen(true)}
            className="text-[11px] text-zinc-400 hover:text-zinc-200 underline ml-2 shrink-0 cursor-pointer"
          >
            Симулятор темпа
          </button>
        </div>
      </div>

      {/* Cards List Section with Filter & Sorting Controls */}
      <div className="flex-1 flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-300">Список карточек</span>
            <div className="flex items-center gap-1 bg-[#121215] border border-zinc-800 rounded-xl p-0.5 ml-1">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-2 py-0.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-zinc-800 text-zinc-100 font-bold'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Все ({deckCards.length})
              </button>
              {stats.difficultCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterMode('difficult')}
                  className={`px-2 py-0.5 rounded-lg text-xs font-mono transition-colors cursor-pointer flex items-center gap-1 ${
                    filterMode === 'difficult'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800/60 font-bold'
                      : 'text-rose-400/80 hover:text-rose-300'
                  }`}
                  title="Карточки с 3+ ошибками"
                >
                  <AlertCircle className="w-3 h-3 text-rose-400" />
                  <span>Трудные ({stats.difficultCount})</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 bg-[#121215] border border-zinc-800 rounded-xl px-2.5 py-1 text-xs text-zinc-300">
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent border-none text-xs text-zinc-200 focus:outline-none cursor-pointer pr-1"
              >
                <option value="due_first" className="bg-zinc-900">Сначала на повторение</option>
                <option value="difficult_first" className="bg-zinc-900">По ошибкам (сначала трудные)</option>
                <option value="mastery_asc" className="bg-zinc-900">По % (сначала трудные)</option>
                <option value="mastery_desc" className="bg-zinc-900">По % (сначала выученные 100%)</option>
                <option value="time_spent" className="bg-zinc-900">По затраченному времени</option>
                <option value="newest" className="bg-zinc-900">Сначала новые</option>
                <option value="alphabetical" className="bg-zinc-900">По алфавиту (A-Z)</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative w-52 sm:w-60">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Поиск по фразам..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#121215] border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
              />
            </div>
          </div>
        </div>

        {processedCards.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[#121215]/50 border border-zinc-800/60 flex flex-col items-center justify-center">
            <Layers className="w-8 h-8 text-zinc-600 mb-2" />
            <p className="text-sm text-zinc-400 font-medium">Нет карточек для отображения</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm">
              {filterMode === 'difficult'
                ? 'Отлично! В этой колоде нет трудных карточек с частыми ошибками.'
                : 'Нажмите «Импорт списка», чтобы быстро вставить фразы от нейросети.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayedCards.map((card) => (
              <DeckCardItem
                key={card.id}
                card={card}
                onEdit={onEditCard}
                onDelete={onDeleteCard}
              />
            ))}

            {visibleCount < processedCards.length && (
              <div className="pt-4 pb-8 flex flex-col items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setVisibleCount(prev => prev + 50)}
                  className="px-5 py-2.5 rounded-xl bg-[#121215] hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-zinc-100 text-xs font-medium transition-colors cursor-pointer shadow-sm active:scale-[0.98]"
                >
                  Показать еще 50 карточек (показано {displayedCards.length} из {processedCards.length})
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

      {/* Deck Simulator & Target Date Modal */}
      <DeckSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        deckName={deck.name}
        totalCards={stats.total}
        dueCardsCount={stats.dueCount}
        newCardsCount={stats.newCount}
        activeCardsCount={stats.activeCount}
        currentDailyGoal={settings.dailyGoal || 20}
        onApplyDailyGoal={(newGoal) => {
          onUpdateSettings({ ...settings, dailyGoal: newGoal });
        }}
      />
    </div>
  );
};
