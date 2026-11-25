'use client';

import React, { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { AppSettings, FlashCard } from '@/types';
import { createNewFSRSCard } from '@/lib/fsrs';
import { getRussianTranscription } from '@/lib/transcription';
import { formatWordGlossString } from '@/lib/gloss';
import { tts } from '@/lib/tts';

interface SingleWordTabProps {
  targetDeckId: string;
  settings: AppSettings;
  onAdd: (card: FlashCard) => void;
  onClose: () => void;
}

export const SingleWordTab: React.FC<SingleWordTabProps> = ({
  targetDeckId,
  settings,
  onAdd,
  onClose,
}) => {
  const [back, setBack] = useState('');
  const [front, setFront] = useState('');
  const [transcription, setTranscription] = useState('');
  const [gloss, setGloss] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!back.trim() || !front.trim() || !targetDeckId) return;

    const newCard: FlashCard = {
      id: `card-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      deckId: targetDeckId,
      front: front.trim(),
      back: back.trim(),
      transcription: transcription.trim() || getRussianTranscription(back.trim()) || undefined,
      gloss: gloss.trim() || formatWordGlossString(back.trim()) || undefined,
      fsrsCard: createNewFSRSCard(),
      createdAt: Date.now(),
      timeSpentSeconds: 0,
    };

    onAdd(newCard);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="add-word-back" className="text-zinc-400 font-medium">
            Английское слово или фраза
          </label>
          {back.trim() && (
            <button
              type="button"
              onClick={() =>
                tts.speak(back.trim(), {
                  accent: settings.voiceAccent,
                  gender: settings.voiceGender,
                  rate: settings.speechRate,
                })
              }
              className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer"
            >
              <Volume2 className="w-3 h-3" />
              <span>Озвучить</span>
            </button>
          )}
        </div>
        <input
          id="add-word-back"
          type="text"
          autoFocus
          required
          value={back}
          onChange={(e) => setBack(e.target.value)}
          placeholder="Например: Accomplish"
          className="w-full bg-zinc-950 border border-white/[0.08] focus:border-zinc-500 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="add-word-front" className="block text-zinc-400 font-medium mb-1">
          Русский перевод
        </label>
        <input
          id="add-word-front"
          type="text"
          required
          value={front}
          onChange={(e) => setFront(e.target.value)}
          placeholder="Например: Достигать, выполнять"
          className="w-full bg-zinc-950 border border-white/[0.08] focus:border-zinc-500 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="add-word-trans" className="text-zinc-400 font-medium">
              Транскрипция
            </label>
            {back.trim() && (
              <button
                type="button"
                onClick={() => setTranscription(getRussianTranscription(back))}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                Авто
              </button>
            )}
          </div>
          <input
            id="add-word-trans"
            type="text"
            value={transcription}
            onChange={(e) => setTranscription(e.target.value)}
            placeholder="Авто при сохранении"
            className="w-full bg-zinc-950 border border-white/[0.08] focus:border-zinc-500 rounded-xl px-3 py-2 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none font-mono"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="add-word-gloss" className="text-zinc-400 font-medium">
              Пословный разбор
            </label>
            {back.trim() && (
              <button
                type="button"
                onClick={() => setGloss(formatWordGlossString(back))}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                Авто
              </button>
            )}
          </div>
          <input
            id="add-word-gloss"
            type="text"
            value={gloss}
            onChange={(e) => setGloss(e.target.value)}
            placeholder="Авто при сохранении"
            className="w-full bg-zinc-950 border border-white/[0.08] focus:border-zinc-500 rounded-xl px-3 py-2 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium transition-colors cursor-pointer"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={!back.trim() || !front.trim() || !targetDeckId}
          className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-100 border border-white/15 font-semibold transition-colors cursor-pointer"
        >
          Добавить слово
        </button>
      </div>
    </form>
  );
};
