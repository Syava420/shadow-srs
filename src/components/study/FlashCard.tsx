'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Volume2, RotateCcw, Pencil, BookOpen } from 'lucide-react';
import { FlashCard as FlashCardType } from '@/types';
import { tts } from '@/lib/tts';
import { getRussianTranscription } from '@/lib/transcription';
import { getWordGloss, GlossItem } from '@/lib/gloss';
import { enrichGlossOnline } from '@/lib/onlineEnrichment';
import { isCardDue, isCardNew, calculateMasteryPercent, getCardLapses } from '@/lib/fsrs';

export type CardDirection = 'ru_to_en' | 'en_to_ru';

interface FlashCardProps {
  card: FlashCardType;
  direction: CardDirection;
  isFlipped: boolean;
  onFlip: () => void;
  onRate: (isRemembered: boolean) => void;
  onEdit: () => void;
  showImages: boolean;
  voiceAccent: 'en-US' | 'en-GB';
  voiceGender?: 'male' | 'female';
  speechRate: number;
  showTranscription?: boolean;
}

export const FlashCard: React.FC<FlashCardProps> = ({
  card,
  direction,
  isFlipped,
  onFlip,
  onRate,
  onEdit,
  showImages,
  voiceAccent,
  voiceGender,
  speechRate,
  showTranscription = true,
}) => {
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDraggingState, setIsDraggingState] = useState(false);
  const isDraggingRef = useRef(false);
  const lastTouchEndRef = useRef<number>(0);

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActiveRef = useRef(false);

  const startLongPress = () => {
    isLongPressActiveRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(40);
      }
      onEdit();
    }, 450);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const [showGloss, setShowGloss] = useState(false);
  const [enrichedResult, setEnrichedResult] = useState<{ cardId: string; gloss: string } | null>(
    null
  );

  useEffect(() => {
    let isCancelled = false;
    enrichGlossOnline(card.back).then((res) => {
      if (!isCancelled && res) {
        setEnrichedResult({ cardId: card.id, gloss: res });
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [card.id, card.back]);

  const enrichedGloss = enrichedResult?.cardId === card.id ? enrichedResult.gloss : null;

  const isRuToEn = direction === 'ru_to_en';
  const questionText = isRuToEn ? card.front : card.back;
  const answerText = isRuToEn ? card.back : card.front;

  const rawTranscription =
    card.transcription && card.transcription.trim()
      ? card.transcription.trim()
      : getRussianTranscription(card.back);
  const displayTranscription = rawTranscription
    ? rawTranscription.startsWith('[')
      ? rawTranscription
      : `[${rawTranscription}]`
    : '';

  const glossItems: GlossItem[] = useMemo(() => {
    const glossSource = (card.gloss && card.gloss.trim()) || enrichedGloss;
    if (glossSource && glossSource.trim()) {
      const parts = glossSource.split('·').map((p) => p.trim());
      return parts.map((p) => {
        const match = p.match(/^(.+?)\s*\((.+?)\)$/);
        if (match) return { word: match[1].trim(), gloss: match[2].trim() };
        return { word: p, gloss: '' };
      });
    }
    return getWordGloss(card.back);
  }, [card.back, card.gloss, enrichedGloss]);

  const lastAudioClickRef = useRef<number>(0);

  const handleReplayAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    const isSlow = now - lastAudioClickRef.current < 1600;
    lastAudioClickRef.current = now;

    const rate = isSlow ? Math.max(0.6, speechRate * 0.65) : speechRate;
    tts.speak(card.back, { accent: voiceAccent, gender: voiceGender, rate });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStartX(touch.clientX);
    setTouchStartY(touch.clientY);
    isDraggingRef.current = true;
    setIsDraggingState(true);
    startLongPress();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || touchStartX === null || touchStartY === null) return;
    const diffX = e.touches[0].clientX - touchStartX;
    const diffY = e.touches[0].clientY - touchStartY;

    if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
      cancelLongPress();
    }
    setDragOffset(diffX);
  };

  const handleTouchEnd = () => {
    cancelLongPress();
    if (isLongPressActiveRef.current) {
      isLongPressActiveRef.current = false;
      isDraggingRef.current = false;
      setIsDraggingState(false);
      setDragOffset(0);
      setTouchStartX(null);
      setTouchStartY(null);
      return;
    }

    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDraggingState(false);
    lastTouchEndRef.current = Date.now();

    if (dragOffset > 70 && isFlipped) {
      onRate(true);
    } else if (dragOffset < -70 && isFlipped) {
      onRate(false);
    } else if (Math.abs(dragOffset) < 15) {
      onFlip();
    }

    setDragOffset(0);
    setTouchStartX(null);
    setTouchStartY(null);
  };

  const handleClick = () => {
    if (isLongPressActiveRef.current) {
      isLongPressActiveRef.current = false;
      return;
    }
    if (Date.now() - lastTouchEndRef.current < 450) {
      return;
    }
    // Don't flip if user is selecting text to copy
    const selectedText = typeof window !== 'undefined' ? window.getSelection()?.toString() : '';
    if (selectedText && selectedText.length > 0) return;
    onFlip();
  };

  const hasCustomImage =
    showImages && card.imageUrl && !card.imageUrl.startsWith('data:image/svg+xml');
  const swipeRotation = dragOffset * 0.04;
  const statusLabel = isCardNew(card)
    ? 'Новое'
    : isCardDue(card)
      ? 'Повтор'
      : 'Практика';
  const lapses = getCardLapses(card);

  return (
    <div
      onClick={handleClick}
      onMouseDown={startLongPress}
      onMouseUp={cancelLongPress}
      onMouseLeave={cancelLongPress}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: dragOffset !== 0 ? `translateX(${dragOffset}px) rotate(${swipeRotation}deg)` : undefined,
        transition: isDraggingState ? 'none' : 'transform 0.25s ease-out',
      }}
      className="w-full max-w-2xl h-[58dvh] min-h-[320px] max-h-[540px] cursor-pointer perspective-1000 touch-pan-y"
    >
      <div
        className={`relative w-full h-full transition-transform duration-300 transform-style-3d ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* FRONT SIDE */}
        <div className="absolute inset-0 w-full h-full backface-hidden rounded-2xl bg-[#111216] border border-white/10 hover:border-white/20 p-5 sm:p-10 flex flex-col items-center justify-between shadow-xl transition-colors">
          {/* Top Minimal Bar */}
          <div className="w-full flex items-center justify-between gap-2 select-none">
            <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
              <span>{isRuToEn ? 'RU → EN' : 'EN → RU'}</span>
              <span className="text-zinc-700">·</span>
              <span>{statusLabel}</span>
              {lapses >= 3 && (
                <>
                  <span className="text-zinc-700">·</span>
                  <span className="text-rose-400">ошибок: {lapses}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {!isRuToEn && (
                <button
                  type="button"
                  onClick={handleReplayAudio}
                  className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10 transition-colors cursor-pointer"
                  title="Озвучить (R, дважды — медленно)"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-white/[0.08] transition-colors cursor-pointer"
                title="Редактировать"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Center Question */}
          <div className="text-center my-auto px-2 w-full">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-zinc-100 leading-snug max-w-xl mx-auto">
              {questionText}
            </h2>
            {!isRuToEn && showTranscription && displayTranscription && (
              <p className="text-sm text-zinc-400 mt-3 font-mono tracking-wide">
                {displayTranscription}
              </p>
            )}

            {!isRuToEn && showGloss && glossItems.length > 0 && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex flex-wrap justify-center items-start gap-x-3 gap-y-2 mt-5 px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/[0.08] max-w-lg mx-auto text-center"
              >
                {glossItems.map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center min-w-[32px]">
                    <span className="text-xs font-medium text-zinc-200">{item.word}</span>
                    <span className="text-[11px] text-zinc-400">{item.gloss}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Bar */}
          <div className="w-full flex items-center justify-between text-[11px] text-zinc-500 select-none">
            <span className="w-8" />
            <span className="font-mono">клик по карточке — ответ</span>
            <div className="w-8 flex justify-end">
              {!isRuToEn && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowGloss((prev) => !prev);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowGloss((prev) => !prev);
                  }}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    showGloss
                      ? 'bg-zinc-800 text-zinc-100 border-white/15'
                      : 'bg-zinc-950 text-zinc-500 hover:text-zinc-200 border-white/[0.08]'
                  }`}
                  title={showGloss ? 'Скрыть пословный разбор' : 'Пословный разбор'}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* BACK SIDE */}
        <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-2xl bg-[#111216] border border-white/10 p-5 sm:p-10 flex flex-col items-center justify-between shadow-xl">
          {/* Top Bar */}
          <div className="w-full flex items-center justify-between gap-2 select-none">
            <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFlip();
                }}
                className="p-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-white/[0.08] transition-colors cursor-pointer"
                title="Перевернуть обратно"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <span>
                {isCardNew(card) ? 'новое' : `${calculateMasteryPercent(card)}% памяти`}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-white/[0.08] transition-colors cursor-pointer"
                title="Редактировать"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleReplayAudio}
                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-white/15 transition-colors cursor-pointer"
                title="Повторить звук (R)"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center Answer */}
          <div className="my-auto text-center flex flex-col items-center px-2 w-full">
            {hasCustomImage && (
              <div className="w-44 h-28 sm:w-56 sm:h-36 rounded-xl overflow-hidden mb-5 border border-white/10 bg-zinc-900 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={card.imageUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-100 leading-snug max-w-xl">
              {answerText}
            </h2>

            {isRuToEn && showTranscription && displayTranscription && (
              <p className="text-sm text-zinc-400 mt-2.5 font-mono tracking-wide">
                {displayTranscription}
              </p>
            )}

            {isRuToEn && showGloss && glossItems.length > 0 && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex flex-wrap justify-center items-start gap-x-3 gap-y-2 mt-4 px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/[0.08] max-w-lg mx-auto text-center"
              >
                {glossItems.map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center min-w-[32px]">
                    <span className="text-xs font-medium text-zinc-200">{item.word}</span>
                    <span className="text-[11px] text-zinc-400">{item.gloss}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Question Reminder & Gloss Toggle */}
          <div className="w-full flex items-center justify-between text-xs text-zinc-400 select-none">
            <span className="w-8" />
            <div className="text-center max-w-md truncate px-2">
              <span className="text-zinc-400">{questionText}</span>
              {!isRuToEn && showTranscription && displayTranscription && (
                <span className="block text-[11px] text-zinc-500 font-mono mt-0.5">
                  {displayTranscription}
                </span>
              )}
            </div>
            <div className="w-8 flex justify-end">
              {isRuToEn && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowGloss((prev) => !prev);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowGloss((prev) => !prev);
                  }}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    showGloss
                      ? 'bg-zinc-800 text-zinc-100 border-white/15'
                      : 'bg-zinc-950 text-zinc-500 hover:text-zinc-200 border-white/[0.08]'
                  }`}
                  title={showGloss ? 'Скрыть пословный разбор' : 'Пословный разбор'}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
