'use client';

import React from 'react';
import { FlashCard } from '@/types';
import { isCardDue, isCardNew, calculateMasteryPercent, getCardLapses } from '@/lib/fsrs';
import { generateThematicSvg } from '@/lib/image-service';
import { tts } from '@/lib/tts';
import { Volume2, Settings2, Trash2, Clock, CheckCircle2 } from 'lucide-react';

interface DeckCardItemProps {
  card: FlashCard;
  onEdit: (card: FlashCard) => void;
  onDelete?: (cardId: string) => void;
}

export const DeckCardItem: React.FC<DeckCardItemProps> = ({
  card,
  onEdit,
  onDelete,
}) => {
  const isDue = isCardDue(card);
  const isNew = isCardNew(card);
  const mastery = calculateMasteryPercent(card);
  const lapses = getCardLapses(card);
  const isDifficult = lapses >= 3;

  const formatSpentTime = (secs?: number) => {
    if (!secs || secs <= 0) return '0 сек';
    if (secs < 60) return `${Math.round(secs)} сек`;
    return `${(secs / 60).toFixed(1)} мин`;
  };

  return (
    <div
      onClick={() => onEdit(card)}
      className="relative p-3.5 rounded-xl bg-[#121215] hover:bg-[#151518] border border-zinc-800/70 transition-all flex items-center justify-between gap-4 group cursor-pointer overflow-hidden shadow-sm"
    >
      {/* Subtle Background Mastery Progress Bar */}
      <div
        className="absolute left-0 bottom-0 top-0 bg-zinc-800/20 pointer-events-none transition-all duration-300"
        style={{ width: `${mastery}%` }}
      />

      <div className="flex items-center gap-3 flex-1 min-w-0 z-10">
        {/* Visual Art/Photo Thumbnail */}
        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-zinc-900 border border-zinc-800 shadow-inner">
          <img
            src={card.imageUrl || generateThematicSvg(card.back)}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>

        {/* Bilingual Texts */}
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

      {/* Status, Badges & Actions */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 z-10">
        {/* Time spent (desktop only) */}
        <div className="hidden md:flex items-center gap-1 text-[11px] text-zinc-500 font-mono" title="Потрачено времени на эту карту">
          <Clock className="w-3 h-3 text-zinc-600" />
          <span>{formatSpentTime(card.timeSpentSeconds)}</span>
        </div>

        {/* Difficult Card Badge (3+ lapses) */}
        {isDifficult && (
          <span
            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-850/60"
            title={`Забыто ${lapses} раз(а). Рекомендуется упростить перевод или добавить мнемонику.`}
          >
            {lapses} ошиб.
          </span>
        )}

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

        {/* Action buttons */}
        <div className="hidden sm:flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(card);
            }}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Настройки карточки"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>

          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Удалить карточку "${card.back}"?`)) {
                  onDelete(card.id);
                }
              }}
              className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Удалить карточку"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
