'use client';

import React, { useState, useMemo } from 'react';
import { Deck, FlashCard, DirectionMode, AppSettings } from '@/types';
import { calculateDeckStats, isCardDue, isCardNew, calculateMasteryPercent } from '@/lib/fsrs';
import { tts } from '@/lib/tts';
import { 
  Play, Plus, Search, Volume2, Trash2, Settings2,
  Sparkles, Layers, ArrowUpDown, Clock, CheckCircle2,
  Pencil, Target, SlidersHorizontal
} from 'lucide-react';
import { DeckSimulatorModal } from '@/components/modals/DeckSimulatorModal';

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

type SortOption = 'due_first' | 'mastery_asc' | 'mastery_desc' | 'time_spent' | 'newest' | 'alphabetical';

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

  // Filter and sort cards
  const processedCards = useMemo(() => {
    let result = deckCards.filter(card => 
      card.front.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.back.toLowerCase().includes(searchQuery.toLowerCase())
    );

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'due_first': {
          const scoreA = isCardDue(a) ? 2 : isCardNew(a) ? 1 : 0;
          const scoreB = isCardDue(b) ? 2 : isCardNew(b) ? 1 : 0;
          return scoreB - scoreA;
        }
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
  }, [deckCards, searchQuery, sortBy]);

  const formatSpentTime = (secs?: number) => {
    if (!secs || secs <= 0) return '0 сек';
    if (secs < 60) return `${Math.round(secs)} сек`;
    return `${(secs / 60).toFixed(1)} мин`;
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto bg-[#09090b] p-4 md:p-6 select-none">
      {/* Top Banner / Deck Overview */}
      <div className="p-6 rounded-2xl bg-[#121215] border border-zinc-800/80 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Колода</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-200">{deck.name}</h2>
              {onEditDeck && (
                <button
                  onClick={() => onEditDeck(deck)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Редактировать / переместить в папку"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              {onDeleteDeck && (
                <button
                  onClick={() => {
                    if (confirm(`Удалить колоду "${deck.name}" и все её карточки?`)) {
                      onDeleteDeck(deck.id);
                    }
                  }}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Удалить колоду"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {deck.description && (
              <p className="text-xs md:text-sm text-zinc-400 mt-1">{deck.description}</p>
            )}
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* Primary Action 1: Mass Import List */}
            <button
              onClick={onOpenImport}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-100 text-xs font-medium transition-colors cursor-pointer border border-zinc-700/80 shadow-sm"
              title="Вставить сразу список из 100+ фраз от нейросети"
            >
              <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
              <span>Импорт списка (из нейросети)</span>
            </button>

            {/* Minor Action: Add 1 Card */}
            <button
              onClick={() => onAddCard(deck.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors cursor-pointer border border-zinc-800"
              title="Создать 1 карточку вручную"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ 1 шт.</span>
            </button>

            {/* Direction Mode Selector */}
            <select
              value={directionMode}
              onChange={(e) => handleDirectionChange(e.target.value as DirectionMode)}
              className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 text-xs border border-zinc-800 outline-none cursor-pointer focus:border-zinc-700 transition-colors"
              title="Направление изучения карточек"
            >
              <option value="adaptive">Адаптивный (En ⇄ Ru)</option>
              <option value="random">Случайный (50 / 50)</option>
              <option value="ru_en">RU → EN (Говорение)</option>
              <option value="en_ru">EN → RU (Аудирование)</option>
            </select>

            {/* Session Batch Limit or Duration Selector */}
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
              className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 text-xs border border-zinc-800 outline-none cursor-pointer focus:border-zinc-700 transition-colors font-mono"
              title="Режим тренировки: по времени или по количеству карточек"
            >
              <optgroup label="По времени:">
                <option value="time_5">5 минут (~12 карт)</option>
                <option value="time_10">10 минут (~25 карт)</option>
                <option value="time_15">15 минут (~35 карт)</option>
                <option value="time_20">20 минут (~50 карт)</option>
              </optgroup>
              <optgroup label="По количеству:">
                <option value={5}>5 карточек</option>
                <option value={10}>10 карточек</option>
                <option value={20}>20 карточек</option>
                <option value={30}>30 карточек</option>
                <option value={50}>50 карточек</option>
                <option value={0}>Без лимита</option>
              </optgroup>
            </select>

            {/* Primary Action 2: Study */}
            <button
              onClick={() => onStartStudy(deck.id, directionMode, settings.sessionLimit)}
              disabled={deckCards.length === 0}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl font-medium text-xs transition-all cursor-pointer ${
                deckCards.length === 0
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-800'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-950 shadow-md active:scale-[0.98]'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
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
          </div>
        </div>

        {/* FSRS Mini Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-zinc-800/60 text-xs">
          <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/60">
            <div className="text-zinc-500 text-[11px] mb-1">К повторению сегодня</div>
            <div className="text-lg font-bold text-amber-400 font-mono">{stats.dueCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/60">
            <div className="text-zinc-500 text-[11px] mb-1">Новые слова</div>
            <div className="text-lg font-bold text-blue-400 font-mono">{stats.newCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/60">
            <div className="text-zinc-500 text-[11px] mb-1">В активе (освоено)</div>
            <div className="text-lg font-bold text-emerald-400 font-mono">
              {stats.activeCount} <span className="text-xs text-zinc-500 font-normal">из {stats.total}</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/60">
            <div className="text-zinc-500 text-[11px] mb-1">Всего в колоде</div>
            <div className="text-lg font-bold text-zinc-300 font-mono">{stats.total}</div>
          </div>
        </div>

        {/* Study Pace Forecast Banner with Simulator Trigger */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/60 mt-4 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-300 flex-shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div className="text-zinc-200 font-medium">
                {stats.dueCount === 0 && stats.newCount === 0 ? (
                  <span>Все слова колоды освоены и повторены</span>
                ) : (
                  <span>
                    При темпе {settings.dailyGoal || 20} карт/день: финиш через{' '}
                    <strong className="text-emerald-400 font-mono">
                      {Math.ceil((stats.dueCount + stats.newCount) / (settings.dailyGoal || 20))} дн.
                    </strong>
                  </span>
                )}
              </div>
              <div className="text-zinc-500 text-[11px]">
                {stats.dueCount === 0 && stats.newCount === 0
                  ? 'Колода чиста! Отдыхайте до завтра.'
                  : `Осталось: ${stats.dueCount} повторений + ${stats.newCount} новых (${stats.dueCount + stats.newCount} шт.)`}
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsSimulatorOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors border border-zinc-700/60 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
            <span>Симулятор темпа</span>
          </button>
        </div>
      </div>

      {/* Cards List Section with Filter & Sorting Controls */}
      <div className="flex-1 flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-300">Список карточек</span>
            <span className="text-xs text-zinc-500 font-mono">({processedCards.length})</span>
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
              Нажмите «Импорт списка», чтобы быстро вставить фразы от нейросети.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {processedCards.map((card) => {
              const isDue = isCardDue(card);
              const isNew = isCardNew(card);
              const mastery = calculateMasteryPercent(card);

              return (
                <div
                  key={card.id}
                  onClick={() => onEditCard(card)}
                  className="relative p-3.5 rounded-xl bg-[#121215] hover:bg-[#151518] border border-zinc-800/70 transition-all flex items-center justify-between gap-4 group cursor-pointer overflow-hidden shadow-sm"
                >
                  {/* Subtle Background Mastery Progress Bar */}
                  <div
                    className="absolute left-0 bottom-0 top-0 bg-zinc-800/20 pointer-events-none transition-all duration-300"
                    style={{ width: `${mastery}%` }}
                  />

                  <div className="flex items-center gap-3 flex-1 min-w-0 z-10">
                    {/* Visual Art/Photo Thumbnail (Only if image exists) */}
                    {card.imageUrl && (
                      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-zinc-900 border border-zinc-800 shadow-inner">
                        <img
                          src={card.imageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Bilingual Texts - Spacious and Readable */}
                    <div className="min-w-0 flex-1 pr-1">
                      <div className="text-xs text-zinc-400 line-clamp-2 break-words mb-0.5 leading-snug">
                        {card.front}
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-zinc-100 break-words flex items-start gap-1.5 leading-snug">
                        <span className="flex-1">{card.back}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            tts.speak(card.back);
                          }}
                          className="text-zinc-500 hover:text-zinc-300 p-0.5 cursor-pointer flex-shrink-0 mt-0.5"
                          title="Прослушать произношение"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Status, Time & Actions */}
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 z-10">
                    {/* Time spent (desktop only) */}
                    <div className="hidden md:flex items-center gap-1 text-[11px] text-zinc-500 font-mono" title="Потрачено времени на эту карту">
                      <Clock className="w-3 h-3 text-zinc-600" />
                      <span>{formatSpentTime(card.timeSpentSeconds)}</span>
                    </div>

                    {/* Due Badge (desktop only) */}
                    {isDue && (
                      <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40">
                        Повторить
                      </span>
                    )}
                    {isNew && (
                      <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/40">
                        Новая
                      </span>
                    )}

                    {/* Mastery % Badge */}
                    <div
                      className={`text-[11px] font-mono px-2 py-0.5 rounded border flex items-center gap-1.5 ${
                        mastery >= 90
                          ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-400 font-semibold'
                          : isDue
                          ? 'bg-amber-950/40 border-amber-800/40 text-amber-300 font-medium'
                          : mastery > 0
                          ? 'bg-zinc-850 border-zinc-700/60 text-zinc-300'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                      }`}
                      title={isDue ? 'Требует повторения сегодня' : `${mastery}% усвоения`}
                    >
                      {isDue && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 sm:hidden animate-pulse" />}
                      {mastery >= 90 && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                      <span>{mastery}%</span>
                    </div>

                    {/* Action buttons (desktop/tablet only, on phone tap card to edit) */}
                    <div className="hidden sm:flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditCard(card);
                        }}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Настройки карточки"
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Удалить карточку "${card.back}"?`)) {
                            onDeleteCard(card.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Удалить карточку"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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
