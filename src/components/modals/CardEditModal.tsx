'use client';

import React, { useState } from 'react';
import { X, Check, Volume2, Trash2, ArrowLeftRight, Upload, Image as ImageIcon } from 'lucide-react';
import { AppSettings, FlashCard } from '@/types';
import { calculateMasteryPercent, createNewFSRSCard, getCardLapses } from '@/lib/fsrs';
import { tts } from '@/lib/tts';
import { getRussianTranscription } from '@/lib/transcription';
import { formatWordGlossString } from '@/lib/gloss';
import { ModalDialog } from './ModalDialog';

interface CardEditModalProps {
  isOpen: boolean;
  deckId: string;
  cardToEdit?: FlashCard | null;
  settings?: AppSettings;
  onClose: () => void;
  onSaveCard: (card: FlashCard) => void;
  onDeleteCard?: (cardId: string) => void;
}

const CardEditModalInner: React.FC<Omit<CardEditModalProps, 'isOpen'>> = ({
  deckId,
  cardToEdit,
  settings,
  onClose,
  onSaveCard,
  onDeleteCard,
}) => {
  const [front, setFront] = useState(cardToEdit?.front || '');
  const [back, setBack] = useState(cardToEdit?.back || '');
  const [transcription, setTranscription] = useState(cardToEdit?.transcription || '');
  const [gloss, setGloss] = useState(cardToEdit?.gloss || '');
  const [imageUrl, setImageUrl] = useState(
    cardToEdit?.imageUrl && !cardToEdit.imageUrl.startsWith('data:image/svg+xml')
      ? cardToEdit.imageUrl
      : ''
  );
  const [error, setError] = useState<string | null>(null);

  const handleSwapSides = () => {
    const temp = front;
    setFront(back);
    setBack(temp);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) {
      setError('Заполните обе стороны карточки.');
      return;
    }

    const card: FlashCard = {
      id: cardToEdit?.id || `card-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      deckId: cardToEdit?.deckId || deckId,
      front: front.trim(),
      back: back.trim(),
      transcription: transcription.trim() || undefined,
      gloss: gloss.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      fsrsCard: cardToEdit?.fsrsCard || createNewFSRSCard(),
      createdAt: cardToEdit?.createdAt || Date.now(),
      lastStudiedAt: cardToEdit?.lastStudiedAt,
      timeSpentSeconds: cardToEdit?.timeSpentSeconds || 0,
    };

    onSaveCard(card);
    onClose();
  };

  const playAudio = (rateMultiplier = 1) => {
    if (!back.trim()) return;
    tts.speak(back.trim(), {
      accent: settings?.voiceAccent,
      gender: settings?.voiceGender,
      rate: (settings?.speechRate ?? 1.0) * rateMultiplier,
    });
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
        <h2 id="card-edit-title" className="text-base font-semibold text-zinc-100">
          {cardToEdit ? 'Карточка' : 'Новая карточка'}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Real FSRS Telemetry Strip (if editing existing card) */}
      {cardToEdit && (
        <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs bg-zinc-950 border border-white/[0.06] rounded-xl p-2.5 tabular-nums">
          <div>
            <span className="text-[10px] text-zinc-500 block">Память</span>
            <strong className="text-zinc-200">{calculateMasteryPercent(cardToEdit)}%</strong>
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 block">Стабил.</span>
            <strong className="text-zinc-200">{(cardToEdit.fsrsCard?.stability || 0).toFixed(1)}д</strong>
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 block">Повторов</span>
            <strong className="text-zinc-200">{cardToEdit.fsrsCard?.reps || 0}</strong>
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 block">Срывов</span>
            <strong className={getCardLapses(cardToEdit) > 0 ? 'text-rose-400' : 'text-zinc-200'}>
              {getCardLapses(cardToEdit)}
            </strong>
          </div>
        </div>
      )}

      {/* Back (English) */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="card-back-input" className="text-xs font-medium text-zinc-400">
            Английский (Фраза / Слово)
          </label>
          {back.trim() && (
            <div className="flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => playAudio(0.8)}
                className="text-zinc-400 hover:text-zinc-200 font-mono cursor-pointer"
                title="Медленно (0.8x)"
              >
                0.8x
              </button>
              <button
                type="button"
                onClick={() => playAudio(1.0)}
                className="flex items-center gap-1 text-zinc-300 hover:text-white cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Слушать</span>
              </button>
            </div>
          )}
        </div>
        <input
          id="card-back-input"
          type="text"
          autoFocus
          value={back}
          onChange={(e) => {
            setBack(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Например: Don't take it to heart"
          className="w-full bg-zinc-950 border border-white/[0.08] focus:border-zinc-500 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none"
        />
      </div>

      {/* Front (Russian) */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="card-front-input" className="text-xs font-medium text-zinc-400">
            Русский перевод
          </label>
          <button
            type="button"
            onClick={handleSwapSides}
            className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer"
          >
            <ArrowLeftRight className="w-3 h-3" />
            <span>Поменять</span>
          </button>
        </div>
        <input
          id="card-front-input"
          type="text"
          value={front}
          onChange={(e) => {
            setFront(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Например: Не принимай близко к сердцу"
          className="w-full bg-zinc-950 border border-white/[0.08] focus:border-zinc-500 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none"
        />
      </div>

      {/* Transcription & Gloss */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="card-trans-input" className="text-xs font-medium text-zinc-400">
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
            id="card-trans-input"
            type="text"
            value={transcription}
            onChange={(e) => setTranscription(e.target.value)}
            placeholder="Авто при показе"
            className="w-full bg-zinc-950 border border-white/[0.08] focus:border-zinc-500 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none font-mono"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="card-gloss-input" className="text-xs font-medium text-zinc-400">
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
            id="card-gloss-input"
            type="text"
            value={gloss}
            onChange={(e) => setGloss(e.target.value)}
            placeholder="Don't (не) · take (брать)"
            className="w-full bg-zinc-950 border border-white/[0.08] focus:border-zinc-500 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Optional uploaded image */}
      <div className="flex items-center justify-between text-xs pt-1">
        <span className="text-zinc-400 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Картинка (по желанию)</span>
        </span>
        <div className="flex items-center gap-2">
          {imageUrl && (
            <button
              type="button"
              onClick={() => setImageUrl('')}
              className="text-[11px] text-rose-400 hover:underline cursor-pointer"
            >
              Убрать
            </button>
          )}
          <label className="flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white cursor-pointer px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/[0.08]">
            <Upload className="w-3 h-3" />
            <span>Загрузить</span>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {error && <p className="text-xs text-rose-400">{error}</p>}

      {/* Footer */}
      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
        {cardToEdit && onDeleteCard ? (
          <button
            type="button"
            onClick={() => {
              if (confirm('Удалить эту карточку?')) {
                onDeleteCard(cardToEdit.id);
                onClose();
              }
            }}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Удалить</span>
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            Отмена
          </button>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-white/15 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Сохранить</span>
          </button>
        </div>
      </div>
    </form>
  );
};

export const CardEditModal: React.FC<CardEditModalProps> = (props) => {
  return (
    <ModalDialog
      isOpen={props.isOpen}
      onClose={props.onClose}
      ariaLabelledBy="card-edit-title"
      className="w-[calc(100%-1.5rem)] max-w-lg bg-[#111216] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl text-zinc-100"
    >
      <CardEditModalInner
        key={`${props.cardToEdit?.id || 'new'}-${props.isOpen}`}
        deckId={props.deckId}
        cardToEdit={props.cardToEdit}
        settings={props.settings}
        onClose={props.onClose}
        onSaveCard={props.onSaveCard}
        onDeleteCard={props.onDeleteCard}
      />
    </ModalDialog>
  );
};
