'use client';

import React, { useState } from 'react';
import { AppSettings, FlashCard } from '@/types';
import { isCardDue, isCardNew, calculateMasteryPercent, getCardLapses } from '@/lib/fsrs';
import { tts } from '@/lib/tts';
import { Volume2, Pencil, Trash2, CheckCircle2 } from 'lucide-react';

interface DeckCardItemProps {
  card: FlashCard;
  settings: AppSettings;
  onEdit: (card: FlashCard) => void;
  onDelete?: (cardId: string) => void;
}

export const DeckCardItem: React.FC<DeckCardItemProps> = ({
  card,
  settings,
  onEdit,
  onDelete,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const isDue = isCardDue(card);
  const isNew = isCardNew(card);
  const mastery = calculateMasteryPercent(card);
  const lapses = getCardLapses(card);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(true);
    tts.speak(card.back, {
      accent: settings.voiceAccent,
      gender: settings.voiceGender,
      rate: settings.speechRate,
    });
    setTimeout(() => setIsPlaying(false), 900);
  };

  return (
    <div
      onClick={() => onEdit(card)}
      className="p-3 sm:px-4 sm:py-3 rounded-xl bg-[#111216] hover:bg-zinc-900/90 border border-white/[0.06] hover:border-white/15 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
    >
      {/* Left: Sound + Selectable Bilingual Text (No random SVG clutter, no orange tags) */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          type="button"
          onClick={handlePlay}
          className={`p-2 rounded-lg border transition-colors cursor-pointer shrink-0 ${
            isPlaying
              ? 'bg-zinc-800 border-zinc-500 text-zinc-100'
              : 'bg-zinc-950 hover:bg-zinc-800 border-white/[0.08] text-zinc-400 hover:text-zinc-200'
          }`}
          title="Прослушать произношение"
        >
          {isPlaying ? (
            <div className="flex items-center gap-0.5 h-3.5 w-3.5 justify-center">
              <span className="w-0.5 bg-zinc-200 rounded-full animate-wave-1" />
              <span className="w-0.5 bg-zinc-200 rounded-full animate-wave-2" />
              <span className="w-0.5 bg-zinc-200 rounded-full animate-wave-3" />
            </div>
          ) : (
            <Volume2 className="w-3.5 h-3.5" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-zinc-100 break-words leading-snug">
            {card.back}
          </div>
          <div className="text-xs text-zinc-400 break-words leading-snug mt-0.5">
            {card.front}
          </div>
        </div>
      </div>

      {/* Right: Quiet Status Dot + Tabular % + Subtle Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="flex items-center gap-1.5 text-xs font-mono tabular-nums text-zinc-400"
          title={
            lapses >= 3
              ? `Трудное слово (срывов: ${lapses})`
              : isDue
              ? 'Требует повторения сегодня'
              : isNew
              ? 'Новое слово'
              : `Память: ${mastery}%`
          }
        >
          {mastery >= 90 ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                lapses >= 3
                  ? 'bg-rose-400'
                  : isDue
                  ? 'bg-amber-400'
                  : isNew
                  ? 'bg-zinc-500'
                  : 'bg-zinc-400'
              }`}
            />
          )}
          <span className={mastery >= 90 ? 'text-zinc-300' : 'text-zinc-400'}>
            {mastery}%
          </span>
        </div>

        <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(card);
            }}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Редактировать"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Удалить карточку «${card.back}»?`)) {
                  onDelete(card.id);
                }
              }}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Удалить"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
