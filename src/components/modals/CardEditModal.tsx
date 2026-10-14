'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, Image as ImageIcon, Volume2, Sparkles, Trash2, ArrowLeftRight, Upload } from 'lucide-react';
import { FlashCard } from '@/types';
import { createNewFSRSCard } from '@/lib/fsrs';
import { generateThematicSvg } from '@/lib/image-service';
import { tts } from '@/lib/tts';
import { getRussianTranscription } from '@/lib/transcription';
import { formatWordGlossString } from '@/lib/gloss';

interface CardEditModalProps {
  isOpen: boolean;
  deckId: string;
  cardToEdit?: FlashCard | null;
  onClose: () => void;
  onSaveCard: (card: FlashCard) => void;
  onDeleteCard?: (cardId: string) => void;
}

export const CardEditModal: React.FC<CardEditModalProps> = ({
  isOpen,
  deckId,
  cardToEdit,
  onClose,
  onSaveCard,
  onDeleteCard,
}) => {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [transcription, setTranscription] = useState('');
  const [gloss, setGloss] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    if (cardToEdit) {
      setFront(cardToEdit.front);
      setBack(cardToEdit.back);
      setTranscription(cardToEdit.transcription || '');
      setGloss(cardToEdit.gloss || '');
      setImageUrl(cardToEdit.imageUrl || '');
    } else {
      setFront('');
      setBack('');
      setTranscription('');
      setGloss('');
      setImageUrl('');
    }
  }, [cardToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSwapSides = () => {
    const temp = front;
    setFront(back);
    setBack(temp);
  };

  const handleGenerateArt = () => {
    if (!back.trim()) {
      alert('Сначала введите английскую фразу, чтобы создать иллюстрацию.');
      return;
    }
    setImageUrl(generateThematicSvg(back));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!front.trim() || !back.trim()) {
      alert('Пожалуйста, заполните обе стороны карточки.');
      return;
    }

    const card: FlashCard = {
      id: cardToEdit?.id || `card-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      deckId: cardToEdit?.deckId || deckId,
      front: front.trim(),
      back: back.trim(),
      transcription: transcription.trim() || undefined,
      gloss: gloss.trim() || undefined,
      imageUrl: imageUrl.trim() || generateThematicSvg(back.trim()),
      fsrsCard: cardToEdit?.fsrsCard || createNewFSRSCard(),
      createdAt: cardToEdit?.createdAt || Date.now(),
      timeSpentSeconds: cardToEdit?.timeSpentSeconds || 0,
    };

    onSaveCard(card);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-lg bg-[#121215] border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
          <h3 className="text-base font-semibold text-zinc-100">
            {cardToEdit ? 'Настройка карточки' : 'Новая карточка'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Front (Russian) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-zinc-400">
              Вопрос (Русский текст)
            </label>
            <button
              type="button"
              onClick={handleSwapSides}
              className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer"
              title="Поменять русский и английский местами"
            >
              <ArrowLeftRight className="w-3 h-3" />
              <span>Поменять стороны</span>
            </button>
          </div>
          <input
            type="text"
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder="Например: Не принимай близко к сердцу"
            className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
          />
        </div>

        {/* Back (English) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-zinc-400">
              Ответ (Английский текст)
            </label>
            {back.trim() && (
              <button
                type="button"
                onClick={() => tts.speak(back)}
                className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                <Volume2 className="w-3 h-3" />
                <span>Прослушать</span>
              </button>
            )}
          </div>
          <input
            type="text"
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder="Например: Don't take it to heart"
            className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
          />
        </div>

        {/* Phonetic Pronunciation (Russian letters) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-zinc-400">
              Произношение русскими буквами (для начинающих)
            </label>
            {back.trim() && (
              <button
                type="button"
                onClick={() => setTranscription(getRussianTranscription(back))}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                title="Автоматически рассчитать транскрипцию"
              >
                Автозаполнение
              </button>
            )}
          </div>
          <input
            type="text"
            value={transcription}
            onChange={(e) => setTranscription(e.target.value)}
            placeholder="Оставьте пустым для автогенерации, например: [до́унт тэйк ит ту харт]"
            className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
          />
        </div>

        {/* Literal Word-by-Word Gloss */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-zinc-400">
              Пословный дословный перевод (опционально)
            </label>
            {back.trim() && (
              <button
                type="button"
                onClick={() => setGloss(formatWordGlossString(back))}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                title="Автоматически рассчитать пословный перевод"
              >
                Автозаполнение
              </button>
            )}
          </div>
          <input
            type="text"
            value={gloss}
            onChange={(e) => setGloss(e.target.value)}
            placeholder="Оставьте пустым для автогенерации, например: Don't (не) · take (брать) · it (это)"
            className="w-full bg-[#09090b] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
          />
        </div>

        {/* Image Controls */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Визуальное оформление</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGenerateArt}
                className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Сгенерировать арт</span>
              </button>

              <label className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer">
                <Upload className="w-3 h-3" />
                <span>Загрузить с ПК</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {imageUrl && (
            <div className="relative w-40 h-24 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 group">
              <img src={imageUrl} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setImageUrl('')}
                className="absolute top-1 right-1 p-1 rounded-lg bg-black/70 text-zinc-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="Удалить картинку"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
          {cardToEdit && onDeleteCard ? (
            <button
              type="button"
              onClick={() => {
                if (confirm('Точно удалить эту карточку?')) {
                  onDeleteCard(cardToEdit.id);
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Удалить карточку</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-medium transition-colors cursor-pointer shadow-md"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Сохранить</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
