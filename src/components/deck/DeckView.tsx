'use client';

import React, { useState, useMemo } from 'react';
import { Deck, FlashCard, DirectionMode, AppSettings } from '@/types';
import { calculateDeckStats, isCardDue, isCardNew, calculateMasteryPercent, isCardDifficult } from '@/lib/fsrs';
import { tts } from '@/lib/tts';
import { 
  Play, Plus, Search, Volume2, Trash2, Settings2,
  Sparkles, Layers, ArrowUpDown, Clock, CheckCircle2,
  Pencil, Target, SlidersHorizontal, AlertCircle
} from 'lucide-react';
import { DeckSimulatorModal } from '@/components/modals/DeckSimulatorModal';
import { DeckCardItem } from './DeckCardItem';

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

type SortOption = 'due_first' | 'difficult_first' | 'mastery_asc' | 'mastery_desc' | 'time_spent' | 'newest' | 'alphabetical';
type FilterOption = 'all' | 'difficult';

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

  const deckCards = cards.filter(c => c.deckId === deck.id);
  const stats = calculateDeckStats(deckCards);

  // Calculate upcoming study session batch composition
  const studyBatchBreakdown = useMemo(() => {
    const limit = (settings.sessionDurationMinutes && settings.sessionDurationMinutes > 0)
      ? Math.round(settings.sessionDurationMinutes * 2.5)
      : (settings.sessionLimit || 20);
    const dueCount = stats.dueCount;
    const newCount = stats.newCount;

    if (dueCount > 0 && newCount > 0) {
      const baseReviews = Math.ceil(limit * 0.7);
      const targetReviews = Math.min(dueCount, baseReviews);
      const targetNews = Math.min(newCount, Math.max(0, limit - targetReviews));
      return { reviews: targetReviews, news: targetNews, isPractice: false };
    }
    if (dueCount > 0) {
      return { reviews: Math.min(dueCount, limit), news: 0, isPractice: false };
    }
    if (newCount > 0) {
      return { reviews: 0, news: Math.min(newCount, limit), isPractice: false };
    }
    return { reviews: Math.min(deckCards.length, limit), news: 0, isPractice: true };
  }, [stats.dueCount, stats.newCount, settings.sessionLimit, settings.sessionDurationMinutes, deckCards.length]);

  // Filter and sort cards
  const processedCards = useMemo(() => {
    let result = deckCards.filter(card => {
      const matchesSearch = 
        card.front.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.back.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (filterMode === 'difficult') {
        return isCardDifficult(card);
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'due_first': {
          const scoreA = isCardDue(a) ? 2 : isCardNew(a) ? 1 : 0;
          const scoreB = isCardDue(b) ? 2 : isCardNew(b) ? 1 : 0;
          return scoreB - scoreA;
        }
        case 'difficult_first':
          return (b.fsrsCard?.lapses || 0) - (a.fsrsCard?.lapses || 0);
        case 'mastery_asc':
          return calculateMasteryPercent(a) - calculateMasteryPercent(b);
        case 'mastery_desc':
          return calculateMasteryPercent(b) - calculateMasteryPercent(a);
        case 'time_spent':
          return (b.timeSpentSeconds || 0) - (a.timeSpentSeconds || 0);
        case 'alphabetical':
          return a.back.localeCompare(b.back);
        case 'newest':
        default:
          return b.createdAt - a.createdAt;
      }
    });

    return result;
  }, [deckCards, searchQuery, sortBy, filterMode]);

  const formatSpentTime = (secs?: number) => {
    if (!secs || secs <= 0) return '0 сек';
    if (secs < 60) return `${Math.round(secs)} сек`;
    return `${(secs / 60).toFixed(1)} мин`;
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto bg-[#09090b] p-4 md:p-6 select-none">
      {/* Top Banner / Deck Overview - Clean & Ergonomic */}
      <div className="p-5 md:p-6 rounded-2xl bg-[#121215] border border-zinc-800/80 mb-5 shadow-sm">
        {/* Row 1: Deck Title + Quick Actions */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Колода</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-100 truncate">{deck.name}</h2>
              {onEditDeck && (
                <button
                  onClick={() => onEditDeck(deck)}
                  className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Редактировать колоду"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              {onDeleteDeck && (
                <button
                  onClick={() => {
                    if (confirm(`Удалить колоду "${deck.name}" и все её карточки?`)) {
                      onDeleteDeck(deck.id);
                    }
                  }}
                  className="p-1 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Удалить колоду"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {deck.description && (
              <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{deck.description}</p>
            )}
          </div>

          {/* Quick Actions (Add word / Import) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onAddCard(deck.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-750 transition-colors cursor-pointer"
              title="Добавить карточку вручную"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Слово</span>
            </button>
            <button
              onClick={onOpenImport}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors cursor-pointer"
              title="Импорт списка из нейросети"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Row 2: Hero Study Button */}
        <div className="mt-4">
          <button
            onClick={() => onStartStudy(deck.id, directionMode, settings.sessionLimit)}
            disabled={deckCards.length === 0}
            className={`w-full py-3 px-5 rounded-xl font-semibold text-sm transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-md active:scale-[0.99] ${
              deckCards.length === 0
                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-800'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-950'
            }`}
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
                : studyBatchBreakdown.news > 0 && studyBatchBreakdown.reviews > 0
                ? `В этой порции: ${studyBatchBreakdown.reviews} на повторение + ${studyBatchBreakdown.news} новых`
                : studyBatchBreakdown.reviews > 0
                ? `В этой порции: ${studyBatchBreakdown.reviews} карточек на повторение`
                : `В этой порции: ${studyBatchBreakdown.news} новых карточек`}
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
            {processedCards.map((card) => (
              <DeckCardItem
                key={card.id}
                card={card}
                onEdit={onEditCard}
                onDelete={onDeleteCard}
              />
            ))}
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
